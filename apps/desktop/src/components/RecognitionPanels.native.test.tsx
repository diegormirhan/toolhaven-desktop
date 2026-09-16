import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { ImageSearchPanel } from './ImageSearchPanel';
import { MusicPanel } from './MusicPanel';
import { createCatalogRows } from '../catalog/catalog';

vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), convertFileSrc: (path: string) => `asset://${path}` }));

beforeEach(() => Object.defineProperty(window, '__TAURI_INTERNALS__', { configurable: true, value: {} }));
afterEach(() => {
  Reflect.deleteProperty(window, '__TAURI_INTERNALS__');
  vi.resetAllMocks();
});

function catalogTool(toolId: string) {
  const tool = createCatalogRows().flatMap(row => row.tools).find(entry => entry.id === toolId);
  if (!tool) throw new Error(`${toolId} catalog entry missing`);
  return tool;
}

async function choose(combobox: HTMLElement, label: string | RegExp) {
  await userEvent.click(combobox);
  const list = await screen.findByRole('listbox');
  await userEvent.click(within(list).getByRole('option', { name: label }));
}

const engines = [
  { id: 'google', label: 'Google Lens', uploads: true },
  { id: 'yandex', label: 'Yandex', uploads: false },
  { id: 'bing', label: 'Bing', uploads: false },
  { id: 'tineye', label: 'TinEye', uploads: false },
];

const sources = [
  { id: 'dev-speakers', label: 'Speakers (Realtek)', kind: 'playback', isDefault: true },
  { id: 'dev-mic', label: 'Microphone (Blue Yeti)', kind: 'microphone', isDefault: true },
];

// ── Reverse image search ────────────────────────────────────────────────

it('sends a picture from this machine to the one engine that accepts an upload', async () => {
  vi.mocked(invoke).mockImplementation(async (command: string) => {
    if (command === 'image_search_engines') return engines;
    if (command === 'search_by_image') return 'https://www.google.com/search?vsrid=abc';
    throw new Error(`unexpected ${command}`);
  });

  render(
    <ImageSearchPanel tool={catalogTool('image-search')} initialPath="C:/pictures/cat.png" onClose={vi.fn()} />,
  );

  await userEvent.click(screen.getByRole('button', { name: 'Search' }));

  await waitFor(() =>
    expect(invoke).toHaveBeenCalledWith('search_by_image', {
      request: { engine: 'google', path: 'C:/pictures/cat.png', imageUrl: null },
    }),
  );
  expect(await screen.findByText('Opened in your browser.')).toBeInTheDocument();
});

it('offers every engine once an address is typed, because none of them needs the file', async () => {
  vi.mocked(invoke).mockImplementation(async (command: string) => {
    if (command === 'image_search_engines') return engines;
    return 'https://yandex.com/images/search';
  });

  render(<ImageSearchPanel tool={catalogTool('image-search')} initialPath="C:/pictures/cat.png" onClose={vi.fn()} />);
  await screen.findByRole('combobox', { name: 'Search with' });

  // With a local file chosen, only the uploading engine is on offer.
  await userEvent.click(screen.getByRole('combobox', { name: 'Search with' }));
  expect(within(await screen.findByRole('listbox')).getAllByRole('option')).toHaveLength(1);
  await userEvent.keyboard('{Escape}');

  await userEvent.type(screen.getByLabelText('Picture address'), 'https://example.test/cat.jpg');
  await choose(screen.getByRole('combobox', { name: 'Search with' }), 'Yandex');
  await userEvent.click(screen.getByRole('button', { name: 'Search' }));

  await waitFor(() =>
    expect(invoke).toHaveBeenCalledWith('search_by_image', {
      request: { engine: 'yandex', path: null, imageUrl: 'https://example.test/cat.jpg' },
    }),
  );
});

it('refuses a file the search cannot read, and says which kinds it takes', async () => {
  vi.mocked(invoke).mockResolvedValue(engines);
  vi.mocked(open).mockResolvedValue('C:/documents/report.pdf');

  render(<ImageSearchPanel tool={catalogTool('image-search')} onClose={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: 'Choose a picture' }));

  expect(await screen.findByText(/not something this tool reads/i)).toBeInTheDocument();
  expect(invoke).not.toHaveBeenCalledWith('search_by_image', expect.anything());
});

it('says plainly that this is the tool that leaves the machine', async () => {
  vi.mocked(invoke).mockResolvedValue(engines);
  render(<ImageSearchPanel tool={catalogTool('image-search')} onClose={vi.fn()} />);

  expect(screen.getByText(/the one tool here that leaves your machine/i)).toBeInTheDocument();
});

it('reports a refusal from the host instead of pretending the browser opened', async () => {
  vi.mocked(invoke).mockImplementation(async (command: string) => {
    if (command === 'image_search_engines') return engines;
    throw 'Google Lens refused the upload (HTTP 429). Try again in a moment.';
  });

  render(<ImageSearchPanel tool={catalogTool('image-search')} initialPath="C:/pictures/cat.png" onClose={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: 'Search' }));

  expect(await screen.findByText(/HTTP 429/)).toBeInTheDocument();
  expect(screen.queryByText('Opened in your browser.')).not.toBeInTheDocument();
});

// ── Music recognition ───────────────────────────────────────────────────

const match = {
  matched: true,
  title: 'Bohemian Rhapsody',
  artist: 'Queen',
  album: 'A Night at the Opera',
  released: '1975',
  label: 'Hollywood Records',
  genre: 'Rock',
  url: 'https://www.shazam.com/track/40333615',
  coverUrl: 'https://images.test/large.jpg',
  message: 'Matched: Bohemian Rhapsody — Queen.',
};

it('listens to what the machine is playing by default, not to the room', async () => {
  vi.mocked(invoke).mockImplementation(async (command: string) => {
    if (command === 'list_audio_sources') return sources;
    return match;
  });

  render(<MusicPanel tool={catalogTool('songrec')} onClose={vi.fn()} />);
  await screen.findByRole('combobox', { name: 'Sound source' });
  await userEvent.click(screen.getByRole('button', { name: /identify/i }));

  await waitFor(() =>
    expect(invoke).toHaveBeenCalledWith('recognize_music', {
      request: { source: 'device', path: null, deviceId: 'dev-speakers', seconds: 12, startSeconds: 0 },
    }),
  );
});

it('shows every field of a match, with the cover art described for a screen reader', async () => {
  vi.mocked(invoke).mockImplementation(async (command: string) => {
    if (command === 'list_audio_sources') return sources;
    return match;
  });

  render(<MusicPanel tool={catalogTool('songrec')} onClose={vi.fn()} />);
  await screen.findByRole('combobox', { name: 'Sound source' });
  await userEvent.click(screen.getByRole('button', { name: /identify/i }));

  const card = await screen.findByLabelText('What was recognised');
  expect(within(card).getByRole('heading', { name: 'Bohemian Rhapsody' })).toBeInTheDocument();
  expect(within(card).getByText('Queen')).toBeInTheDocument();
  expect(within(card).getByText('A Night at the Opera')).toBeInTheDocument();
  expect(within(card).getByText('1975')).toBeInTheDocument();
  expect(within(card).getByAltText('Cover art for Bohemian Rhapsody')).toBeInTheDocument();
  expect(within(card).getByRole('link', { name: /open the track page/i })).toHaveAttribute(
    'href',
    'https://www.shazam.com/track/40333615',
  );
});

it('says so when nothing matched, rather than showing an empty card', async () => {
  vi.mocked(invoke).mockImplementation(async (command: string) => {
    if (command === 'list_audio_sources') return sources;
    return { ...match, matched: false, title: '', artist: '', message: 'No match. Try a louder clip.' };
  });

  render(<MusicPanel tool={catalogTool('songrec')} onClose={vi.fn()} />);
  await screen.findByRole('combobox', { name: 'Sound source' });
  await userEvent.click(screen.getByRole('button', { name: /identify/i }));

  expect(await screen.findByText('No match. Try a louder clip.')).toBeInTheDocument();
  expect(screen.queryByLabelText('What was recognised')).not.toBeInTheDocument();
});

it('reads a file instead, and passes the point to start from', async () => {
  vi.mocked(invoke).mockImplementation(async (command: string) => {
    if (command === 'list_audio_sources') return sources;
    return match;
  });
  vi.mocked(open).mockResolvedValue('C:/music/track.mp3');

  render(<MusicPanel tool={catalogTool('songrec')} onClose={vi.fn()} />);
  await choose(await screen.findByRole('combobox', { name: 'Listen to' }), 'A file on this machine');
  await userEvent.click(screen.getByRole('button', { name: 'Choose a file' }));
  await screen.findByText('track.mp3');

  const start = screen.getByLabelText('Start at (seconds)');
  await userEvent.clear(start);
  await userEvent.type(start, '45');
  await userEvent.click(screen.getByRole('button', { name: /identify/i }));

  await waitFor(() =>
    expect(invoke).toHaveBeenCalledWith('recognize_music', {
      request: { source: 'file', path: 'C:/music/track.mp3', deviceId: null, seconds: 12, startSeconds: 45 },
    }),
  );
});

it('keeps a picture out of the recogniser', async () => {
  vi.mocked(invoke).mockResolvedValue(sources);
  vi.mocked(open).mockResolvedValue('C:/pictures/cat.png');

  render(<MusicPanel tool={catalogTool('songrec')} onClose={vi.fn()} />);
  await choose(await screen.findByRole('combobox', { name: 'Listen to' }), 'A file on this machine');
  await userEvent.click(screen.getByRole('button', { name: 'Choose a file' }));

  expect(await screen.findByText(/not something this tool reads/i)).toBeInTheDocument();
});

it('promises that only the fingerprint is sent', async () => {
  vi.mocked(invoke).mockResolvedValue(sources);
  render(<MusicPanel tool={catalogTool('songrec')} onClose={vi.fn()} />);

  expect(screen.getByText(/only the\s+fingerprint is sent/i)).toBeInTheDocument();
});
