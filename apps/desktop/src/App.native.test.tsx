import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { save } from '@tauri-apps/plugin-dialog';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { App } from './App';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(async () => () => {}) }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }));
vi.mock('@tauri-apps/api/webview', () => ({ getCurrentWebview: vi.fn() }));

type DragDropPayload =
  | { type: 'enter'; paths: string[] }
  | { type: 'over' }
  | { type: 'drop'; paths: string[] }
  | { type: 'leave' };

let emitDragDrop: (payload: DragDropPayload) => void;

type ProgressPayload = {
  jobId: string;
  toolId: string;
  operationId: string;
  phase: string;
  progress: number | null;
  message: string;
};

let emitProgress: (payload: ProgressPayload) => void;
const listeners = new Map<string, (event: { payload: unknown }) => void>();
const emitOn = (event: string, payload: unknown) => listeners.get(event)?.({ payload });

beforeEach(() => {
  Object.defineProperty(window, '__TAURI_INTERNALS__', { configurable: true, value: {} });
  listeners.clear();
  vi.mocked(listen).mockImplementation(async (event, callback) => {
    listeners.set(event as string, callback as (payload: { payload: unknown }) => void);
    if (event === 'operation-progress') {
      emitProgress = payload => (callback as (event: { payload: ProgressPayload }) => void)({ payload });
    }
    return () => {};
  });
  vi.mocked(getCurrentWebview).mockReturnValue({
    onDragDropEvent: async (handler: (event: { payload: DragDropPayload }) => void) => {
      emitDragDrop = payload => handler({ payload });
      return () => {};
    },
  } as unknown as ReturnType<typeof getCurrentWebview>);
});

afterEach(() => {
  Reflect.deleteProperty(window, '__TAURI_INTERNALS__');
  vi.resetAllMocks();
});

/** Resolves once the runner has sent the operation, so the test can read its job id. */
function pendingOperation() {
  let settle: ((value: { stdout: string; outputPath: string | null }) => void) | undefined;
  vi.mocked(invoke).mockImplementation((command: string) => {
    if (command === 'detect_available_tools') return Promise.resolve(['yt-dlp', 'deno', 'ffmpeg', 'ffprobe']);
    return new Promise(resolve => {
      settle = resolve as (value: { stdout: string; outputPath: string | null }) => void;
    });
  });
  return {
    jobId: () => {
      const call = vi.mocked(invoke).mock.calls.find(([command]) => command === 'execute_operation');
      return (call?.[1] as { request: { jobId: string } } | undefined)?.request.jobId ?? '';
    },
    finish: (value: { stdout: string; outputPath: string | null }) => settle?.(value),
  };
}

async function startDownload() {
  const operation = pendingOperation();
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole('button', { name: /abrir yt-dlp/i }));
  await user.type(screen.getByLabelText('URL de mídia'), 'https://example.com/video');
  vi.mocked(save).mockResolvedValue('C:\\videos\\video.mp4');
  await user.click(screen.getByRole('button', { name: 'Executar' }));
  return { operation, user };
}

it('keeps a running operation in the queue after its tool panel is closed', async () => {
  const { operation, user } = await startDownload();

  emitProgress({
    jobId: operation.jobId(),
    toolId: 'yt-dlp',
    operationId: 'download-video',
    phase: 'downloading',
    progress: 0.37,
    message: 'Baixando mídia…',
  });

  await user.click(screen.getByRole('button', { name: 'Fechar ferramenta' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Baixar mídia' })).not.toBeInTheDocument());

  await user.click(screen.getByRole('button', { name: /fila, 1 em execução/i }));

  const row = screen.getByRole('article', { name: /baixar vídeo/i });
  expect(within(row).getByText(/Executando 37%/)).toBeVisible();
  expect(within(row).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '37');
});

it('moves a finished background operation to the history with its output path', async () => {
  const { operation, user } = await startDownload();

  await user.click(screen.getByRole('button', { name: 'Fechar ferramenta' }));
  operation.finish({ stdout: '', outputPath: 'C:\\videos\\video.mp4' });

  await user.click(screen.getByRole('button', { name: 'Histórico' }));

  const row = await screen.findByRole('article', { name: /baixar vídeo/i });
  expect(within(row).getByText('Concluída')).toBeVisible();
  expect(within(row).getByText('C:\\videos\\video.mp4')).toBeVisible();
});

it('records a failed background operation instead of dropping it', async () => {
  vi.mocked(invoke).mockImplementation((command: string) => {
    if (command === 'detect_available_tools') return Promise.resolve(['yt-dlp', 'deno']);
    return Promise.reject('yt-dlp.exe falhou (exit code: 1)');
  });
  const user = userEvent.setup();
  render(<App />);

  await user.click(await screen.findByRole('button', { name: /abrir yt-dlp/i }));
  await user.type(screen.getByLabelText('URL de mídia'), 'https://example.com/video');
  vi.mocked(save).mockResolvedValue('C:\\videos\\video.mp4');
  await user.click(screen.getByRole('button', { name: 'Executar' }));

  await user.click(screen.getByRole('button', { name: 'Fechar ferramenta' }));
  await user.click(screen.getByRole('button', { name: 'Histórico' }));

  const row = await screen.findByRole('article', { name: /baixar vídeo/i });
  expect(within(row).getByText('Falhou')).toBeVisible();
  expect(within(row).getByText(/yt-dlp.exe falhou/)).toBeVisible();
});

it('sends a job id so the host can address progress to one queue entry', async () => {
  const { operation } = await startDownload();
  expect(operation.jobId()).toMatch(/^yt-dlp-download-video-\d+$/);
});

it('accepts a file dropped on the window instead of only the picker button', async () => {
  vi.mocked(invoke).mockResolvedValue(['qpdf']);
  render(<App />);
  await screen.findByRole('button', { name: /abrir qpdf/i });

  act(() => emitDragDrop({ type: 'enter', paths: ['C:\\fixtures\\contrato.pdf'] }));
  expect(await screen.findByText('Solte o arquivo aqui')).toBeVisible();

  act(() => emitDragDrop({ type: 'drop', paths: ['C:\\fixtures\\contrato.pdf'] }));
  expect(await screen.findByText('contrato.pdf')).toBeVisible();
});

it('hands a dropped file to the tool panel that is already open', async () => {
  vi.mocked(invoke).mockResolvedValue(['qpdf']);
  const user = userEvent.setup();
  render(<App />);

  await user.click(await screen.findByRole('button', { name: /abrir qpdf/i }));
  act(() => emitDragDrop({ type: 'drop', paths: ['C:\\fixtures\\contrato.pdf'] }));

  const panel = screen.getByRole('dialog', { name: 'Organizar PDFs' });
  expect(await within(panel).findByText('contrato.pdf')).toBeVisible();
});

it('does not claim a percentage before the tool reports one', async () => {
  const { user } = await startDownload();

  await user.click(screen.getByRole('button', { name: /fila, 1 em execução/i }));

  const row = screen.getByRole('article', { name: /baixar vídeo/i });
  expect(within(row).getByText('Executando')).toBeVisible();
  expect(within(row).queryByText(/%/)).not.toBeInTheDocument();
  expect(within(row).getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
});

it('shows the live host message on the queued row', async () => {
  const { operation, user } = await startDownload();

  emitProgress({
    jobId: operation.jobId(),
    toolId: 'yt-dlp',
    operationId: 'download-video',
    phase: 'downloading',
    progress: null,
    message: 'Juntando vídeo e áudio…',
  });

  await user.click(screen.getByRole('button', { name: /fila, 1 em execução/i }));

  expect(within(screen.getByRole('article', { name: /baixar vídeo/i })).getByText('Juntando vídeo e áudio…')).toBeVisible();
});

it('installs a component from inside the app and shows its progress', async () => {
  let installed = false;
  let finishInstall: (() => void) | undefined;
  vi.mocked(invoke).mockImplementation((command: string) => {
    if (command === 'detect_available_tools') return Promise.resolve(installed ? ['qpdf'] : []);
    if (command === 'install_component') {
      return new Promise<string[]>(resolve => {
        finishInstall = () => { installed = true; resolve(['qpdf']); };
      });
    }
    return Promise.resolve({ stdout: '' });
  });

  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole('button', { name: /ver disponibilidade de qpdf/i }));
  await user.click(screen.getByRole('button', { name: 'Baixar e instalar' }));

  expect(invoke).toHaveBeenCalledWith('install_component', { toolId: 'qpdf' });

  act(() => emitOn('component-progress', { toolId: 'qpdf', phase: 'downloading', progress: 0.5, message: 'Baixando…' }));
  const dialog = screen.getByRole('dialog', { name: /instalar qpdf/i });
  expect(within(dialog).getByText(/Baixando 50%/)).toBeVisible();

  await act(async () => { finishInstall?.(); });
  expect(await screen.findByRole('button', { name: /abrir qpdf/i })).toBeVisible();
});

it('keeps a component that cannot be pinned out of the install flow', async () => {
  vi.mocked(invoke).mockResolvedValue([]);
  const user = userEvent.setup();
  render(<App />);

  await user.click(await screen.findByRole('button', { name: /ver disponibilidade de 7-zip/i }));

  expect(screen.queryByRole('button', { name: 'Baixar e instalar' })).not.toBeInTheDocument();
  expect(invoke).not.toHaveBeenCalledWith('install_component', expect.anything());
});
