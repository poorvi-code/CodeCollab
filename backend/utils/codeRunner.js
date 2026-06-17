import { spawn } from 'child_process';
import { mkdir, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';

const TIME_LIMIT_MS = Number(process.env.CODE_RUN_TIMEOUT_MS || 5000);
const MAX_BUFFER_BYTES = Number(process.env.CODE_RUN_MAX_BUFFER_BYTES || 1024 * 1024);

const LANGUAGE_CONFIG = {
  javascript: {
    extension: 'js',
    fileName: 'main.js',
    run: ({ filePath }) => ({ command: 'node', args: [filePath] })
  },
  python: {
    extension: 'py',
    fileName: 'main.py',
    run: ({ filePath }) => ({ command: process.platform === 'win32' ? 'python' : 'python3', args: [filePath] })
  },
  c: {
    extension: 'c',
    fileName: 'main.c',
    compile: ({ filePath, workDir }) => ({
      command: 'gcc',
      args: [filePath, '-O2', '-o', path.join(workDir, process.platform === 'win32' ? 'main.exe' : 'main')]
    }),
    run: ({ workDir }) => ({ command: path.join(workDir, process.platform === 'win32' ? 'main.exe' : 'main'), args: [] })
  },
  cpp: {
    extension: 'cpp',
    fileName: 'main.cpp',
    compile: ({ filePath, workDir }) => ({
      command: 'g++',
      args: [filePath, '-O2', '-std=c++17', '-o', path.join(workDir, process.platform === 'win32' ? 'main.exe' : 'main')]
    }),
    run: ({ workDir }) => ({ command: path.join(workDir, process.platform === 'win32' ? 'main.exe' : 'main'), args: [] })
  },
  java: {
    extension: 'java',
    fileName: 'Main.java',
    compile: ({ filePath }) => ({ command: 'javac', args: [filePath] }),
    run: ({ workDir }) => ({ command: 'java', args: ['-cp', workDir, 'Main'] })
  }
};

const normalizeLanguage = (language) => {
  const normalized = String(language || '').toLowerCase();
  if (normalized === 'c++') return 'cpp';
  if (normalized === 'js') return 'javascript';
  return normalized;
};

const runProcess = ({ command, args, input = '', cwd }) => {
  const start = process.hrtime.bigint();

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let killedByTimeout = false;
    let outputLimitExceeded = false;

    let child;
    try {
      child = spawn(command, args, {
        cwd,
        shell: false,
        windowsHide: true
      });
    } catch (error) {
      resolve({
        exitCode: 127,
        stdout,
        stderr: `${error.message}\nMake sure "${command}" is installed and available in PATH.`,
        timedOut: false,
        executionTimeMs: Number((process.hrtime.bigint() - start) / 1000000n)
      });
      return;
    }

    const timer = setTimeout(() => {
      killedByTimeout = true;
      child.kill('SIGKILL');
    }, TIME_LIMIT_MS);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      if (Buffer.byteLength(stdout + stderr) > MAX_BUFFER_BYTES) {
        outputLimitExceeded = true;
        child.kill('SIGKILL');
      }
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (Buffer.byteLength(stdout + stderr) > MAX_BUFFER_BYTES) {
        outputLimitExceeded = true;
        child.kill('SIGKILL');
      }
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({
        exitCode: 127,
        stdout,
        stderr: `${error.message}\nMake sure "${command}" is installed and available in PATH.`,
        timedOut: false,
        executionTimeMs: Number((process.hrtime.bigint() - start) / 1000000n)
      });
    });

    child.on('close', (exitCode) => {
      clearTimeout(timer);
      if (outputLimitExceeded) {
        stderr += '\nOutput limit exceeded.';
      }
      resolve({
        exitCode,
        stdout,
        stderr,
        timedOut: killedByTimeout,
        executionTimeMs: Number((process.hrtime.bigint() - start) / 1000000n)
      });
    });

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
};

export const runCode = async ({ language, sourceCode, input }) => {
  const normalizedLanguage = normalizeLanguage(language);
  const config = LANGUAGE_CONFIG[normalizedLanguage];

  if (!config) {
    return {
      language: normalizedLanguage,
      output: '',
      error: `Unsupported language: ${language}`,
      status: 'unsupported',
      executionTimeMs: 0,
      memoryUsageKb: 0
    };
  }

  const workDir = path.join(os.tmpdir(), `codecollab-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(workDir, { recursive: true });
  const filePath = path.join(workDir, config.fileName);

  try {
    await writeFile(filePath, sourceCode || '', 'utf8');

    let totalExecutionTimeMs = 0;
    if (config.compile) {
      const compileResult = await runProcess({ ...config.compile({ filePath, workDir }), cwd: workDir });
      totalExecutionTimeMs += compileResult.executionTimeMs;

      if (compileResult.timedOut) {
        return {
          language: normalizedLanguage,
          output: compileResult.stdout,
          error: compileResult.stderr || 'Compilation timed out.',
          status: 'timeout',
          executionTimeMs: totalExecutionTimeMs,
          memoryUsageKb: Math.round(process.memoryUsage().rss / 1024)
        };
      }

      if (compileResult.exitCode !== 0) {
        return {
          language: normalizedLanguage,
          output: compileResult.stdout,
          error: compileResult.stderr || 'Compilation failed.',
          status: 'compilation_error',
          executionTimeMs: totalExecutionTimeMs,
          memoryUsageKb: Math.round(process.memoryUsage().rss / 1024)
        };
      }
    }

    const runResult = await runProcess({ ...config.run({ filePath, workDir }), input, cwd: workDir });
    totalExecutionTimeMs += runResult.executionTimeMs;

    return {
      language: normalizedLanguage,
      output: runResult.stdout,
      error: runResult.stderr,
      status: runResult.timedOut ? 'timeout' : runResult.exitCode === 0 ? 'success' : 'runtime_error',
      executionTimeMs: totalExecutionTimeMs,
      memoryUsageKb: Math.round(process.memoryUsage().rss / 1024)
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
};

export const supportedLanguages = Object.keys(LANGUAGE_CONFIG);
