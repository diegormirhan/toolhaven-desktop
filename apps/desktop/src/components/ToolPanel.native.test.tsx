import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { open, save } from '@tauri-apps/plugin-dialog';
import { ToolPanel, suggestedOutputName } from './ToolPanel';
import { createCatalogRows } from '../catalog/catalog';
import type { ToolJob } from '../domain/job-queue';

vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }));
beforeEach(() => Object.defineProperty(window, '__TAURI_INTERNALS__', { configurable: true, value: {} }));
afterEach(() => { Reflect.deleteProperty(window, '__TAURI_INTERNALS__'); vi.resetAllMocks(); });

const jobId = 'job-1';

function catalogTool(toolId: string) {
  const tool = createCatalogRows().flatMap(row => row.tools).find(entry => entry.id === toolId);
  if (!tool) throw new Error(`${toolId} catalog entry missing`);
  return tool;
}

function job(overrides: Partial<ToolJob>): ToolJob {
  return {
    id: jobId,
    toolId: 'deno',
    toolName: 'Download runtime',
    operationId: 'runtime',
    operationLabel: 'Show installed version',
    sourceLabel: 'Deno',
    status: 'running',
    progress: 0,
    message: 'Preparing the operation…',
    outputPath: null,
    options: {},
    startedAt: 0,
    ...overrides,
  };
}

it('hands the runner the request envelope expected by the native command', async () => {
  const onRun = vi.fn(() => jobId);
  render(<ToolPanel tool={catalogTool('deno')} onClose={vi.fn()} onRun={onRun} />);

  await userEvent.click(screen.getByRole('button', { name: 'Run' }));

  expect(onRun).toHaveBeenCalledWith(expect.objectContaining({
    request: { toolId: 'deno', operationId: 'runtime', inputPaths: [], outputPath: null, options: {}, sourceUrl: null },
    operationLabel: 'Show installed version',
  }));
});

it('mirrors the live progress the queue reports for its own job', async () => {
  vi.mocked(save).mockResolvedValue('video.mp4');
  const running = job({ toolId: 'yt-dlp', operationId: 'download-video', status: 'running', progress: 0.42, message: 'Downloading media…' });
  render(<ToolPanel tool={catalogTool('yt-dlp')} jobs={[running]} onClose={vi.fn()} onRun={() => jobId} />);

  await userEvent.type(screen.getByLabelText('Media URL'), 'https://example.com/video');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));

  expect(await screen.findByText('Downloading media…')).toBeVisible();
  expect(screen.getByText('42%')).toBeVisible();
  expect(screen.getByRole('progressbar', { name: 'Operation progress' })).toHaveAttribute('aria-valuenow', '42');
  expect(screen.getByText(/keeps running in the queue/i)).toBeVisible();
});

it('reports a failed job as an error instead of a silent success', async () => {
  const failed = job({ status: 'failed', message: 'deno.exe not found' });
  render(<ToolPanel tool={catalogTool('deno')} jobs={[failed]} onClose={vi.fn()} onRun={() => jobId} />);

  await userEvent.click(screen.getByRole('button', { name: 'Run' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('deno.exe not found');
  expect(screen.getByText(/the job failed/i)).toBeVisible();
});

it('shows the host result and the produced output path', async () => {
  const succeeded = job({
    toolId: 'libvips',
    operationId: 'upscale',
    status: 'succeeded',
    progress: 1,
    message: 'Image enlarged 2× with Lanczos3.',
    outputPath: 'image-upscale.png',
  });
  vi.mocked(save).mockResolvedValue('image-upscale.png');
  render(<ToolPanel tool={catalogTool('libvips')} initialPath={'C:\\fixtures\\image.png'} jobs={[succeeded]} onClose={vi.fn()} onRun={() => jobId} />);

  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Operation' }), 'upscale');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));

  expect(await screen.findByText(/image enlarged 2×/i)).toBeVisible();
  expect(screen.getByText(/Output: image-upscale.png/)).toBeVisible();
});

it('selects a directory for project searches', async () => {
  vi.mocked(open).mockResolvedValue('C:\\fixtures');
  const onRun = vi.fn(() => jobId);
  render(<ToolPanel tool={catalogTool('ripgrep')} onClose={vi.fn()} onRun={onRun} />);

  await userEvent.click(screen.getByRole('button', { name: /choose the project folder/i }));
  expect(open).toHaveBeenCalledWith({ directory: true, multiple: false });

  await userEvent.type(screen.getByLabelText('Text or regex'), 'ToolHaven');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));

  expect(onRun).toHaveBeenCalledWith(expect.objectContaining({
    request: expect.objectContaining({ inputPaths: ['C:\\fixtures'], options: { query: 'ToolHaven' } }),
  }));
});

it('passes the file selected in the main workspace to the operation', async () => {
  const onRun = vi.fn(() => jobId);
  render(<ToolPanel tool={catalogTool('jq')} initialPath={'C:\\fixtures\\sample.json'} onClose={vi.fn()} onRun={onRun} />);

  await userEvent.click(screen.getByRole('button', { name: 'Run' }));

  expect(onRun).toHaveBeenCalledWith(expect.objectContaining({
    request: expect.objectContaining({ inputPaths: ['C:\\fixtures\\sample.json'] }),
  }));
});

it('stops before running when the destination dialog is dismissed', async () => {
  vi.mocked(save).mockResolvedValue(null);
  const onRun = vi.fn(() => jobId);
  render(<ToolPanel tool={catalogTool('qpdf')} initialPath={'C:\\fixtures\\contrato.pdf'} onClose={vi.fn()} onRun={onRun} />);

  await userEvent.click(screen.getByRole('button', { name: 'Run' }));

  expect(onRun).not.toHaveBeenCalled();
  expect(await screen.findByRole('alert')).toHaveTextContent(/choose an output file/i);
});

it.each([
  ['ffmpeg', 'extract-audio', 'video.mp4', 'video-extract-audio.mp3'],
  ['7zip', 'compress', 'sample.txt', 'sample-compress.zip'],
  ['pandoc', 'convert', 'article.md', 'article-convert.html'],
  ['libvips', 'compress', 'image.png', 'image-compress.jpg'],
])('suggests a usable output format for %s/%s', (tool, operation, input, output) => {
  expect(suggestedOutputName(input, operation, tool)).toBe(output);
});

it('never lets a metadata edit touch the original file', async () => {
  vi.mocked(save).mockResolvedValue('C:\fotos\foto-set-title.jpg');
  const onRun = vi.fn(() => jobId);
  render(<ToolPanel tool={catalogTool('exiftool')} initialPath={'C:\fotos\foto.jpg'} onClose={vi.fn()} onRun={onRun} />);

  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Operation' }), 'set-title');
  await userEvent.type(screen.getByLabelText('Title'), 'Contrato');
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));

  expect(onRun).toHaveBeenCalledWith(expect.objectContaining({
    request: expect.objectContaining({
      toolId: 'exiftool',
      operationId: 'set-title',
      inputPaths: ['C:\fotos\foto.jpg'],
      outputPath: 'C:\fotos\foto-set-title.jpg',
      options: { title: 'Contrato' },
    }),
  }));
});

it('asks for page and resolution before rasterising a PDF', async () => {
  render(<ToolPanel tool={catalogTool('poppler')} initialPath={'C:\docs\contrato.pdf'} onClose={vi.fn()} onRun={() => jobId} />);

  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Operation' }), 'rasterize');

  expect(screen.getByLabelText('Page')).toHaveValue(1);
  expect(screen.getByLabelText('Resolution (DPI)')).toHaveValue(150);
});

it('does not ask for a destination when the operation only reads', async () => {
  render(<ToolPanel tool={catalogTool('imagemagick')} initialPath={'C:\fotos\foto.png'} onClose={vi.fn()} onRun={() => jobId} />);

  expect(screen.getByText(/the extension decides the format/i)).toBeVisible();
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Operation' }), 'inspect');
  expect(screen.queryByText(/the extension decides the format/i)).not.toBeInTheDocument();
});

it.each([
  ['poppler', 'extract-text', 'contrato.pdf', 'contrato-extract-text.txt'],
  ['poppler', 'rasterize', 'contrato.pdf', 'contrato-rasterize.png'],
  ['oxipng', 'optimize', 'foto.png', 'foto-optimize.png'],
  ['mkvtoolnix', 'remux', 'video.mp4', 'video-remux.mkv'],
  ['exiftool', 'strip', 'foto.jpg', 'foto-strip.jpg'],
])('suggests a usable output format for %s/%s', (tool, operation, input, output) => {
  expect(suggestedOutputName(input, operation, tool)).toBe(output);
});

it('waits for both files before a structural comparison can run', async () => {
  vi.mocked(open).mockResolvedValue(['C:\src\antes.ts', 'C:\src\depois.ts']);
  const onRun = vi.fn(() => jobId);
  render(<ToolPanel tool={catalogTool('difftastic')} onClose={vi.fn()} onRun={onRun} />);

  expect(screen.getByRole('button', { name: 'Run' })).toBeDisabled();

  await userEvent.click(screen.getByRole('button', { name: /choose both files/i }));
  expect(open).toHaveBeenCalledWith({ directory: false, multiple: true });

  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  expect(onRun).toHaveBeenCalledWith(expect.objectContaining({
    request: expect.objectContaining({ inputPaths: ['C:\src\antes.ts', 'C:\src\depois.ts'] }),
  }));
});

it.each(['tokei', 'dust'])('asks %s for a folder instead of a file', async toolId => {
  vi.mocked(open).mockResolvedValue('C:\projeto');
  render(<ToolPanel tool={catalogTool(toolId)} onClose={vi.fn()} onRun={() => jobId} />);

  await userEvent.click(screen.getByRole('button', { name: /choose the project folder/i }));

  expect(open).toHaveBeenCalledWith({ directory: true, multiple: false });
});

it('never offers a destination for a read-only dev tool', () => {
  render(<ToolPanel tool={catalogTool('miller')} initialPath={'C:\dados\vendas.csv'} onClose={vi.fn()} onRun={() => jobId} />);

  expect(screen.queryByRole('button', { name: 'Choose destination' })).not.toBeInTheDocument();
});
