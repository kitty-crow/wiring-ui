import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { Background } from '../model/types';

/** Rasterises the first PDF page locally, then embeds it for offline single-file export. */
export class PdfTemplate {
  public async load(file: File, pageWidth: number, pageHeight: number): Promise<Background> {
    if (!file.name.toLowerCase().endsWith('.pdf'))return this.readImage(file,pageWidth,pageHeight);
    // PDF.js is bundled with the application. Its worker is embedded in the HTML at build time.
    const workerSource=document.getElementById('pdf-worker')?.textContent;
    if (!workerSource)throw new Error('PDF rendering worker missing from this build');
    const workerBlob=new Blob([workerSource],{type:'text/javascript'});
    const workerUrl=URL.createObjectURL(workerBlob);
    pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;
    try {
      const doc=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
      const page=await doc.getPage(1);
      const base=page.getViewport({scale:1});
      const scale=Math.min(2,Math.max(.5,Math.min(pageWidth/base.width,pageHeight/base.height)*2));
      const viewport=page.getViewport({scale});
      const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      const context=canvas.getContext('2d');if(!context)throw new Error('Canvas2D required for PDF import');
      await page.render({canvasContext:context,canvas,viewport}).promise;
      await doc.destroy();
      return {data:canvas.toDataURL('image/png'),opacity:.65,x:0,y:0,width:pageWidth,height:pageHeight};
    }finally{URL.revokeObjectURL(workerUrl);}
  }
  private readImage(file:File,width:number,height:number):Promise<Background>{
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve({data:String(reader.result),opacity:.65,x:0,y:0,width,height});
      reader.onerror=()=>reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}
