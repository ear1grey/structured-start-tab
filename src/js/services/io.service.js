export function downloadJson({ name, data }) {
  const now = (new Date()).toISOString().slice(0, 10).replace(/-/g, '_');

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name != null ? name : `export_${now}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function loadFile({ accept = '.json' } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      reader.readAsText(file);
    };
    input.click();
  });
}
