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
    /// The track's page, for the "open it" button.
    pub url: String,
    pub cover_url: String,
    /// One sentence for the panel, so an empty result still says something.
    pub message: String,
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
        url: first_non_empty(&[
            text(track.get("url")),
            text(track.get("share").and_then(|share| share.get("href"))),
        ]),
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
        assert_eq!(
            result.url,
            "https://www.shazam.com/track/40333615/bohemian-rhapsody"
        );
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

    #[test]
    fn falls_back_to_the_share_link_when_the_track_has_no_url_of_its_own() {
        let without_url = MATCH.replace(
            "\"url\": \"https://www.shazam.com/track/40333615/bohemian-rhapsody\",",
            "",
        );
        assert_eq!(
            parse(&without_url).unwrap().url,
            "https://www.shazam.com/track/40333615"
        );
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
