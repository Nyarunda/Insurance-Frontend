/** Quote every CSV field and neutralize spreadsheet formulas in user-controlled text. */
export function csvText(rows: readonly (readonly (string | number)[])[]): string {
  return '\uFEFF' + rows.map(row => row.map(value => {
    const text = String(value);
    const safe = !/^-?\d+(?:\.\d+)?$/.test(text) && /^[\s]*[=+@\-\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  }).join(',')).join('\r\n');
}

export function downloadCsv(filename: string, rows: readonly (readonly (string | number)[])[]) {
  const url = URL.createObjectURL(new Blob([csvText(rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
