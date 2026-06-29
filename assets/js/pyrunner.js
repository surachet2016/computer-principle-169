// Pyodide Python Runner
let pyodide = null;
let pyodideReady = false;
let pyodideLoading = false;

async function loadPyodideRuntime() {
  if (pyodideReady) return true;
  if (pyodideLoading) return false;
  pyodideLoading = true;

  updateAllStatus('⏳ กำลังโหลด Python runtime...');

  try {
    pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/' });
    pyodideReady = true;
    updateAllStatus('✅ Python พร้อมใช้งาน');
    enableAllRunButtons();
    return true;
  } catch (err) {
    updateAllStatus('❌ โหลดไม่สำเร็จ — ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
    return false;
  }
}

function updateAllStatus(msg) {
  document.querySelectorAll('.pyodide-status').forEach(el => el.textContent = msg);
}

function enableAllRunButtons() {
  document.querySelectorAll('.btn-run').forEach(btn => btn.disabled = false);
}

async function runPython(runnerId) {
  const runner = document.getElementById(runnerId);
  if (!runner) return;

  const textarea = runner.querySelector('textarea');
  const output = runner.querySelector('.py-output');
  const btn = runner.querySelector('.btn-run');

  if (!pyodideReady) {
    output.textContent = '⏳ กำลังโหลด Python... กรุณารอสักครู่';
    output.className = 'py-output';
    const ok = await loadPyodideRuntime();
    if (!ok) {
      output.textContent = '❌ ไม่สามารถโหลด Python ได้';
      output.className = 'py-output has-error';
      return;
    }
  }

  const code = textarea.value;
  if (!code.trim()) {
    output.textContent = 'กรุณาพิมพ์โค้ด Python ก่อนกด Run';
    output.className = 'py-output empty';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '⏳ กำลังรัน...';
  output.textContent = '';
  output.className = 'py-output';

  let captured = [];

  // Capture print output
  pyodide.globals.set('__captured_output__', []);
  const patchPrint = `
import sys, io

class CaptureOutput:
    def __init__(self):
        self.data = []
    def write(self, text):
        self.data.append(text)
    def flush(self):
        pass

__cap__ = CaptureOutput()
sys.stdout = __cap__
sys.stderr = __cap__
`;

  try {
    await pyodide.runPythonAsync(patchPrint);
    await pyodide.runPythonAsync(code);

    const cap = pyodide.globals.get('__cap__');
    const result = cap.data.toJs ? cap.data.toJs().join('') : '';

    await pyodide.runPythonAsync('import sys; sys.stdout = sys.__stdout__; sys.stderr = sys.__stderr__');

    output.textContent = result || '(ไม่มี output)';
    output.className = result ? 'py-output' : 'py-output empty';
  } catch (err) {
    try { await pyodide.runPythonAsync('import sys; sys.stdout = sys.__stdout__; sys.stderr = sys.__stderr__'); } catch {}
    output.textContent = '❌ Error:\n' + err.message;
    output.className = 'py-output has-error';
  }

  btn.disabled = false;
  btn.innerHTML = '▶ Run';
}

function clearRunner(runnerId) {
  const runner = document.getElementById(runnerId);
  if (!runner) return;
  const output = runner.querySelector('.py-output');
  output.textContent = '';
  output.className = 'py-output empty';
}

// Auto-load Pyodide when page loads
window.addEventListener('load', () => {
  if (document.querySelector('.py-runner')) {
    loadPyodideRuntime();
  }
});
