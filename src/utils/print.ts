declare const cspNonce: string;

export function print(title: string, content: string): void {
  const printWindow: WindowProxy | null = window.open(`${title}`, `${title}`, 'height=700, width=900');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(`
          <!DOCTYPE html>
          <html lang="de">
          <head>
            <title>${title}</title>
            <style nonce="${cspNonce}">
              @media print {
                @page {
                  size: auto;
                  margin: 0mm;
                }
                body {
                  margin: 0;
                }
              }
              p { 
                font-size: 30px;
                text-align: center;
                line-height: 300px;
              }
            </style>
          </head>
          <body>
              <p>${content}</p>
          </body>
          </html>
      `);
    printWindow.document.close();
    printWindow.onafterprint = (): void => {
      printWindow.close();
    };
    printWindow.print();
    if (navigator.userAgent.includes('Firefox')) {
      // Since Firefox does not seem to pick up "onafterprint" event
      printWindow.close();
    }
  }
}
