import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open, save } from '@tauri-apps/plugin-dialog';
import { ToolPanel, suggestedOutputName } from './ToolPanel';
import { createCatalogRows } from '../catalog/catalog';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(async () => () => {}) }));
beforeEach(() => Object.defineProperty(window, '__TAURI_INTERNALS__', { configurable: true, value: {} }));
afterEach(() => { Reflect.deleteProperty(window, '__TAURI_INTERNALS__'); vi.resetAllMocks(); });

it('sends the request envelope expected by the native command and records real success', async () => {
  vi.mocked(invoke).mockResolvedValue({ stdout: 'deno 2.9.5', outputPath: null });
  const onQueue = vi.fn();
  const tool = createCatalogRows().flatMap(row => row.tools).find(tool => tool.id === 'deno')!;
  render(<ToolPanel tool={tool} onClose={vi.fn()} onQueue={onQueue} />);
  await userEvent.click(screen.getByRole('button', { name: 'Executar' }));
  expect(invoke).toHaveBeenCalledWith('execute_operation', { request: {
    toolId: 'deno', operationId: 'runtime', inputPaths: [], outputPath: null, options: {}, sourceUrl: null,
  } });
  expect(await screen.findByText('deno 2.9.5')).toBeVisible();
  expect(onQueue).toHaveBeenCalledOnce();
});

it('shows the native error without recording success', async () => {
  vi.mocked(invoke).mockRejectedValue('deno.exe não encontrado');
  const onQueue = vi.fn();
  const tool = createCatalogRows().flatMap(row => row.tools).find(tool => tool.id === 'deno')!;
  render(<ToolPanel tool={tool} onClose={vi.fn()} onQueue={onQueue} />);
  await userEvent.click(screen.getByRole('button', { name: 'Executar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('deno.exe não encontrado');
  expect(onQueue).not.toHaveBeenCalled();
});

it('renders live download progress emitted by the native host', async () => {
  let onProgress: ((event: { payload: unknown }) => void) | undefined;
  vi.mocked(listen).mockImplementation(async (_event, callback) => {
    onProgress = callback as (event: { payload: unknown }) => void;
    return () => {};
  });
  vi.mocked(save).mockResolvedValue('video.mp4');
  let resolveInvoke: ((value: { stdout: string; outputPath: string }) => void) | undefined;
  vi.mocked(invoke).mockImplementation(() => new Promise<{ stdout: string; outputPath: string }>(resolve => {
    onProgress?.({ payload: { toolId: 'yt-dlp', operationId: 'download-video', phase: 'downloading', progress: 0.42, message: 'Baixando mídia…' } });
    resolveInvoke = resolve as (value: { stdout: string; outputPath: string }) => void;
  }));
  const tool = createCatalogRows().flatMap(row => row.tools).find(tool => tool.id === 'yt-dlp')!;
  render(<ToolPanel tool={tool} onClose={vi.fn()} />);
  await userEvent.type(screen.getByLabelText('URL de mídia'), 'https://example.com/video');
  await userEvent.click(screen.getByRole('button', { name: 'Executar' }));
  expect((await screen.findAllByText('Baixando mídia…')).length).toBeGreaterThanOrEqual(1);
  expect(await screen.findByText('42%')).toBeVisible();
  resolveInvoke?.({ stdout: '', outputPath: 'video.mp4' });
});

it('selects a directory for project searches', async () => {
  vi.mocked(open).mockResolvedValue('C:\\fixtures');
  vi.mocked(invoke).mockResolvedValue({ stdout: 'sample.json:1:Workbench' });
  const tool = createCatalogRows().flatMap(row => row.tools).find(tool => tool.id === 'ripgrep')!;
  render(<ToolPanel tool={tool} onClose={vi.fn()} />);
  await userEvent.click(screen.getByText('Escolher pasta do projeto'));
  expect(open).toHaveBeenCalledWith({ directory: true, multiple: false });
  await userEvent.type(screen.getByLabelText('Texto ou regex'), 'Workbench');
  await userEvent.click(screen.getByRole('button', { name: 'Executar' }));
  expect(invoke).toHaveBeenCalledWith('execute_operation', { request: {
    toolId: 'ripgrep', operationId: 'search', inputPaths: ['C:\\fixtures'], outputPath: null,
    options: { query: 'Workbench' }, sourceUrl: null,
  } });
});

it('passes the file selected in the main workspace to the native operation', async () => {
  vi.mocked(invoke).mockResolvedValue({ stdout: '{"count":2}' });
  const tool = createCatalogRows().flatMap(row => row.tools).find(tool => tool.id === 'jq')!;
  render(<ToolPanel tool={tool} initialPath={'C:\\fixtures\\sample.json'} onClose={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: 'Executar' }));
  expect(invoke).toHaveBeenCalledWith('execute_operation', expect.objectContaining({ request: expect.objectContaining({ inputPaths: ['C:\\fixtures\\sample.json'] }) }));
});

it('shows the native upscale result instead of a generic success message', async () => {
  vi.mocked(invoke).mockResolvedValue({ stdout: '', message: 'Imagem ampliada em 2× com Lanczos3.', outputPath: 'image-upscale.png' });
  vi.mocked(save).mockResolvedValue('image-upscale.png');
  const tool = createCatalogRows().flatMap(row => row.tools).find(tool => tool.id === 'libvips')!;
  render(<ToolPanel tool={tool} initialPath={'C:\\fixtures\\image.png'} onClose={vi.fn()} />);
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Operação' }), 'upscale');
  await userEvent.click(screen.getByRole('button', { name: 'Executar' }));
  expect(await screen.findByText(/imagem ampliada em 2×/i)).toBeVisible();
});

it.each([
  ['ffmpeg', 'extract-audio', 'video.mp4', 'video-extract-audio.mp3'],
  ['7zip', 'compress', 'sample.txt', 'sample-compress.zip'],
  ['pandoc', 'convert', 'article.md', 'article-convert.html'],
  ['libvips', 'compress', 'image.png', 'image-compress.jpg'],
])('suggests a usable output format for %s/%s', (tool, operation, input, output) => {
  expect(suggestedOutputName(input, operation, tool)).toBe(output);
});
