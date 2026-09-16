//! Naming a piece of music from a few seconds of it.
//!
//! Three steps, and only the middle one leaves the machine. A clip is recorded —
//! from a microphone, or from whatever the speakers are playing. A fingerprint
//! is computed from it locally. The fingerprint, and never the sound, is what
//! goes to the service that holds the index.
//!
//! The clip is 16-bit PCM written by this app, so the recogniser is handed one
//! format rather than asked to decode whatever it was given.

/// What the interface shows once a match comes back.
#[derive(Debug, Clone, Default, serde::Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Recognition {
    pub matched: bool,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub released: String,
    pub label: String,
    pub genre: String,
    /// Somewhere to actually listen to it.
    ///
    /// Not the recogniser's own track page: that address answers 405 from its
    /// cache, so offering it is offering a dead end. What the response does
    /// carry is the streaming services, and those work.
    pub links: Vec<TrackLink>,
    pub cover_url: String,
    /// One sentence for the panel, so an empty result still says something.
    pub message: String,
}

/// One place the track can be opened, and what to call it.
#[derive(Debug, Clone, Default, serde::Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TrackLink {
    pub label: String,
    pub url: String,
}

/// Reads the recogniser's JSON into the handful of fields worth showing.
///
/// The response is a large document from a service we do not control, so every
/// field is optional by construction: a missing album is a blank line in the
/// panel, never a failed recognition.
pub fn parse(stdout: &str) -> Result<Recognition, String> {
    let trimmed = stdout.trim();
    if trimmed.is_empty() {
        return Err("The recogniser returned nothing at all.".into());
    }
    // The tool prints its JSON last; anything before it is progress chatter.
    let start = trimmed
        .find('{')
        .ok_or_else(|| "The recogniser did not return a result.".to_string())?;
    let document: serde_json::Value = serde_json::from_str(&trimmed[start..])
        .map_err(|_| "The recogniser returned something unreadable.".to_string())?;

    let matches_empty = document
        .get("matches")
        .and_then(|value| value.as_array())
        .map(|list| list.is_empty())
        .unwrap_or(false);
    let Some(track) = document.get("track") else {
        return Ok(Recognition::default());
    };
    if matches_empty && track.get("title").is_none() {
        return Ok(Recognition::default());
    }

    let text = |value: Option<&serde_json::Value>| {
        value
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string()
    };

    Ok(Recognition {
        matched: true,
        title: text(track.get("title")),
        // Shazam files the performer under "subtitle", which is not a name
        // anyone would guess from the panel.
        artist: text(track.get("subtitle")),
        album: metadata(track, "Album"),
        released: metadata(track, "Released"),
        label: metadata(track, "Label"),
        genre: track
            .get("genres")
            .and_then(|genres| genres.get("primary"))
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        links: links_for(track),
        cover_url: first_non_empty(&[
            text(
                track
                    .get("images")
                    .and_then(|images| images.get("coverarthq")),
            ),
            text(track.get("images").and_then(|images| images.get("coverart"))),
        ]),
        message: String::new(),
    })
}

/// Pulls one labelled row out of the track's metadata section.
fn metadata(track: &serde_json::Value, wanted: &str) -> String {
    track
        .get("sections")
        .and_then(|sections| sections.as_array())
        .into_iter()
        .flatten()
        .filter_map(|section| section.get("metadata"))
        .filter_map(|rows| rows.as_array())
        .flatten()
        .find(|row| row.get("title").and_then(|value| value.as_str()) == Some(wanted))
        .and_then(|row| row.get("text"))
        .and_then(|value| value.as_str())
        .unwrap_or_default()
        .to_string()
}

/// Where to listen, one entry per service, best link first.
///
/// Three services, always all three, because "it found the song but offers
/// nothing you use" is a worse answer than one extra button. Each one gets the
/// direct link if the response carried a usable one, and a search on that
/// service otherwise — which always works, and is what the response itself
/// falls back to for most of them anyway.
///
/// Almost none of the addresses in the response are addresses. Apple's arrives
/// wrapped in an Android intent, Spotify's and Deezer's are app schemes that do
/// nothing on a machine without the app, and two more are store pages.
fn links_for(track: &serde_json::Value) -> Vec<TrackLink> {
    let title = track
        .get("title")
        .and_then(|value| value.as_str())
        .unwrap_or_default();
    let artist = track
        .get("subtitle")
        .and_then(|value| value.as_str())
        .unwrap_or_default();
    if title.is_empty() && artist.is_empty() {
        return Vec::new();
    }
    let query = crate::search::encode(format!("{title} {artist}").trim());

    [
        ("applemusic", "Apple Music", format!("https://music.apple.com/search?term={query}")),
        ("spotify", "Spotify", format!("https://open.spotify.com/search/{query}")),
        ("youtubemusic", "YouTube Music", format!("https://music.youtube.com/search?q={query}")),
    ]
    .into_iter()
    .map(|(service, label, search)| TrackLink {
        label: label.to_string(),
        url: direct_link(track, service).unwrap_or(search),
    })
    .collect()
}

/// The response's own link for one service, if a browser can open it.
fn direct_link(track: &serde_json::Value, service: &str) -> Option<String> {
    let hub = track.get("hub")?;
    let from_options = hub
        .get("options")
        .and_then(|options| options.as_array())
        .into_iter()
        .flatten()
        .filter(|option| {
            option
                .get("providername")
                .and_then(|value| value.as_str())
                .map(|name| name.eq_ignore_ascii_case(service))
                .unwrap_or(false)
        });
    let from_providers = hub
        .get("providers")
        .and_then(|providers| providers.as_array())
        .into_iter()
        .flatten()
        .filter(|provider| {
            provider
                .get("type")
                .and_then(|value| value.as_str())
                .map(|name| name.eq_ignore_ascii_case(service))
                .unwrap_or(false)
        });

    from_options
        .chain(from_providers)
        .filter_map(|entry| entry.get("actions"))
        .filter_map(|actions| actions.as_array())
        .flatten()
        .filter_map(|action| action.get("uri"))
        .filter_map(|uri| uri.as_str())
        .find_map(browsable)
}

/// The address a browser can open, or nothing.
///
/// An Android intent carries a real address inside it, which is worth
/// unwrapping: it is how the only direct link to the track arrives.
fn browsable(uri: &str) -> Option<String> {
    let uri = uri.trim();
    if uri.is_empty() {
        return None;
    }
    let candidate = if let Some(rest) = uri.strip_prefix("intent://") {
        let (address, _fragment) = rest.split_once("#Intent").unwrap_or((rest, ""));
        // The intent declares its own scheme and often says http; a music
        // service answers on https, and sending someone to the plain one only
        // buys a redirect.
        format!("https://{address}")
    } else {
        uri.to_string()
    };

    if !candidate.starts_with("https://") {
        return None;
    }
    // Two addresses the response offers that lead nowhere worth going.
    if candidate.contains("unsupported.shazam.com") || candidate.contains("play.google.com/store") {
        return None;
    }
    Some(candidate)
}

fn first_non_empty(candidates: &[String]) -> String {
    candidates
        .iter()
        .find(|value| !value.is_empty())
        .cloned()
        .unwrap_or_default()
}

/// A sentence for a result with nothing in it, so the panel never shows a blank.
pub fn describe(result: &Recognition) -> String {
    if !result.matched {
        // There is nothing to adjust any more, so the advice is about the
        // sound rather than about a setting that no longer exists.
        return "No match. Turn it up, get closer, or try again during a part with vocals."
            .to_string();
    }
    match (result.title.as_str(), result.artist.as_str()) {
        ("", "") => "Matched, but the service returned no title.".to_string(),
        (title, "") => format!("Matched: {title}."),
        (title, artist) => format!("Matched: {title} — {artist}."),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Trimmed from the shape the service actually returns.
    const MATCH: &str = r#"{
      "matches": [{ "id": "12345", "offset": 3.1 }],
      "timestamp": 1700000000,
      "track": {
        "key": "40333615",
        "title": "Bohemian Rhapsody",
        "subtitle": "Queen",
        "url": "https://www.shazam.com/track/40333615/bohemian-rhapsody",
        "images": {
          "coverart": "https://images.test/small.jpg",
          "coverarthq": "https://images.test/large.jpg"
        },
        "share": { "href": "https://www.shazam.com/track/40333615" },
        "genres": { "primary": "Rock" },
        "sections": [
          {
            "type": "SONG",
            "metadata": [
              { "title": "Album", "text": "A Night at the Opera" },
              { "title": "Label", "text": "Hollywood Records" },
              { "title": "Released", "text": "1975" }
            ]
          },
          { "type": "VIDEO" }
        ]
      }
    }"#;

    #[test]
    fn reads_every_field_the_panel_shows() {
        let result = parse(MATCH).unwrap();
        assert!(result.matched);
        assert_eq!(result.title, "Bohemian Rhapsody");
        assert_eq!(result.artist, "Queen");
        assert_eq!(result.album, "A Night at the Opera");
        assert_eq!(result.released, "1975");
        assert_eq!(result.label, "Hollywood Records");
        assert_eq!(result.genre, "Rock");
        // Somewhere to listen, never the recogniser's own page.
        assert_eq!(result.links.len(), 3);
        // The large cover wins when both are offered.
        assert_eq!(result.cover_url, "https://images.test/large.jpg");
    }

    #[test]
    fn reports_no_match_rather_than_failing() {
        let result = parse(r#"{"matches": [], "timestamp": 1700000000}"#).unwrap();
        assert!(!result.matched);
        assert_eq!(
            describe(&result),
            "No match. Turn it up, get closer, or try again during a part with vocals."
        );
    }

    #[test]
    fn survives_a_track_missing_everything_but_a_title() {
        let result = parse(r#"{"matches":[{"id":"1"}],"track":{"title":"Untitled"}}"#).unwrap();
        assert!(result.matched);
        assert_eq!(result.title, "Untitled");
        assert_eq!(result.album, "");
        assert_eq!(result.cover_url, "");
        assert_eq!(describe(&result), "Matched: Untitled.");
    }

    /// The hub exactly as the service returns it, trimmed to the parts that
    /// carry addresses.
    const HUB: &str = r#"{
      "matches": [{ "id": "1" }],
      "track": {
        "title": "Never Gonna Give You Up",
        "subtitle": "Rick Astley",
        "url": "https://www.shazam.com/track/357027/never-gonna-give-you-up",
        "hub": {
          "options": [
            {
              "providername": "applemusic",
              "caption": "OPEN",
              "actions": [
                { "name": "hub:applemusic:deeplink",
                  "uri": "intent://music.apple.com/us/album/never-gonna-give-you-up/1559885420?i=1559885421&app=music#Intent;scheme=http;package=com.apple.android.music;action=android.intent.action.VIEW;end" },
                { "name": "hub:applemusic:connect", "uri": "https://unsupported.shazam.com" },
                { "name": "hub:applemusic:androidstore",
                  "uri": "https://play.google.com/store/apps/details?id=com.apple.android.music" }
              ]
            }
          ],
          "providers": [
            { "type": "SPOTIFY", "caption": "Open in Spotify",
              "actions": [{ "name": "hub:spotify:searchdeeplink", "uri": "spotify:search:Never%20Gonna" }] },
            { "type": "YOUTUBEMUSIC", "caption": "Open in YouTube Music",
              "actions": [{ "name": "hub:youtubemusic:androiddeeplink",
                            "uri": "https://music.youtube.com/search?q=Never+Gonna+Give+You+Up&feature=shazam" }] },
            { "type": "DEEZER", "caption": "Open in Deezer",
              "actions": [{ "name": "hub:deezer:searchdeeplink", "uri": "deezer-query://www.deezer.com/play?query=x" }] }
          ]
        }
      }
    }"#;

    /// Reads the response captured from the live service, so the parser is
    /// checked against what it will actually be handed.
    /// `cargo test -- --ignored --nocapture parses_a_captured_response`
    #[test]
    #[ignore = "reads a response captured while pinning"]
    fn parses_a_captured_response() {
        let path = std::env::temp_dir().join("recog2").join("raw.json");
        let Ok(raw) = std::fs::read_to_string(&path) else {
            println!("no captured response at {}", path.display());
            return;
        };
        let result = parse(&raw).expect("the captured response should parse");
        println!("  {} — {}", result.title, result.artist);
        for link in &result.links {
            println!("  {:<14} {}", link.label, link.url);
            assert!(link.url.starts_with("https://"), "{}", link.url);
            assert!(!link.url.contains("shazam.com/track"));
        }
        assert_eq!(result.links.len(), 3);
    }

    #[test]
    fn offers_the_three_services_with_the_direct_link_where_there_is_one() {
        let links = parse(HUB).unwrap().links;
        assert_eq!(
            links.iter().map(|link| link.label.as_str()).collect::<Vec<_>>(),
            ["Apple Music", "Spotify", "YouTube Music"]
        );

        // Apple's direct link to this exact track arrives wrapped in an Android
        // intent, and unwrapping it is the difference between the song and a
        // search for its name.
        assert!(
            links[0].url.starts_with("https://music.apple.com/us/album/never-gonna-give-you-up/"),
            "{}",
            links[0].url
        );
        // The intent says scheme=http; a music service answers on https.
        assert!(!links[0].url.starts_with("http://"));

        // Spotify's is an app scheme that does nothing without the app, so it
        // becomes a search that works anywhere.
        assert_eq!(
            links[1].url,
            "https://open.spotify.com/search/Never%20Gonna%20Give%20You%20Up%20Rick%20Astley"
        );

        // YouTube Music's own link is already an address, so it is used as is.
        assert_eq!(
            links[2].url,
            "https://music.youtube.com/search?q=Never+Gonna+Give+You+Up&feature=shazam"
        );

        // Never the recogniser's own page: it answers 405 from its cache, which
        // is what sent us looking for these in the first place.
        assert!(!links.iter().any(|link| link.url.contains("shazam.com/track")));
        assert!(!links.iter().any(|link| link.url.contains("unsupported.shazam.com")));
        assert!(!links.iter().any(|link| link.url.contains("play.google.com")));
    }

    #[test]
    fn still_offers_all_three_when_the_response_carries_no_links_at_all() {
        let links = parse(MATCH).unwrap().links;
        assert_eq!(links.len(), 3);
        for link in &links {
            assert!(link.url.starts_with("https://"), "{}", link.url);
            assert!(
                link.url.contains("Bohemian%20Rhapsody%20Queen"),
                "a search for the track it found: {}",
                link.url
            );
        }
    }

    #[test]
    fn has_nothing_to_offer_for_a_track_with_no_name() {
        let nameless = parse(r#"{"matches":[{"id":"1"}],"track":{"key":"1"}}"#).unwrap();
        assert!(nameless.matched);
        assert_eq!(nameless.links, vec![]);
    }

    #[test]
    fn unwraps_an_intent_and_refuses_everything_that_is_not_an_address() {
        assert_eq!(
            browsable("intent://music.apple.com/x?i=1#Intent;scheme=https;end").as_deref(),
            Some("https://music.apple.com/x?i=1")
        );
        assert_eq!(
            browsable("intent://music.apple.com/x").as_deref(),
            Some("https://music.apple.com/x")
        );
        assert_eq!(browsable("spotify:search:x"), None);
        assert_eq!(browsable("deezer-query://www.deezer.com/play?query=x"), None);
        assert_eq!(browsable("http://music.example/x"), None);
        assert_eq!(browsable("   "), None);
    }

    #[test]
    fn ignores_chatter_printed_before_the_json() {
        let noisy = format!("Reading file...\nGenerating fingerprint\n{MATCH}");
        assert_eq!(parse(&noisy).unwrap().title, "Bohemian Rhapsody");
    }

    #[test]
    fn refuses_output_that_is_empty_or_not_json() {
        assert!(parse("").is_err());
        assert!(parse("   \n ").is_err());
        assert!(parse("Segmentation fault").is_err());
        assert!(parse("{ not json at all").is_err());
    }

}
