/** WebGL2 static grid renderer. Falls back to Canvas2D on unsupported devices. */
export class GpuGrid {
  private readonly gl: WebGL2RenderingContext | null;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  public readonly name: string;
  public constructor(private readonly canvas: HTMLCanvasElement) {
    this.gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: false });
    this.name = this.gl ? 'WebGL2' : 'Canvas2D';
    if (this.gl) this.initialise(this.gl);
  }
  private shader(gl: WebGL2RenderingContext, type: number, text: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Cannot create GPU shader');
    gl.shaderSource(shader, text); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(String(gl.getShaderInfoLog(shader)));
    return shader;
  }
  private initialise(gl: WebGL2RenderingContext): void {
    const vertex = this.shader(gl, gl.VERTEX_SHADER, '#version 300 es\nin vec2 position;void main(){gl_Position=vec4(position,0.,1.);}');
    const fragment = this.shader(gl, gl.FRAGMENT_SHADER, '#version 300 es\nprecision highp float;out vec4 color;uniform vec4 ink;void main(){color=ink;}');
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program,vertex); gl.attachShader(program,fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(String(gl.getProgramInfoLog(program)));
    this.program = program; this.buffer = gl.createBuffer();
    gl.deleteShader(vertex); gl.deleteShader(fragment);
  }
  private drawFallback(width:number,height:number,dark:boolean):void {
    const ctx=this.canvas.getContext('2d');if(!ctx)return;
    ctx.clearRect(0,0,width,height);ctx.fillStyle=dark?'#101723':'#f4f7fb';ctx.fillRect(0,0,width,height);
  }
  public draw(width: number, height: number, zoom: number, offsetX: number, offsetY: number, dark: boolean, visible: boolean): void {
    const gl = this.gl;
    if (!gl || !this.program || !this.buffer) {this.drawFallback(width,height,dark);return;}
    gl.viewport(0,0,width,height);
    const base = dark ? [0.063,0.09,0.14,1] : [0.957,0.969,0.984,1];
    gl.clearColor(base[0] ?? 1,base[1] ?? 1,base[2] ?? 1,1); gl.clear(gl.COLOR_BUFFER_BIT);
    if (!visible) return;
    const grid = 25 * zoom;
    if (grid < 7) return;
    const lines: number[] = [];
    for (let x = ((offsetX % grid) + grid) % grid; x < width; x += grid) {
      lines.push(x / width * 2 - 1, -1, x / width * 2 - 1, 1);
    }
    for (let y = ((offsetY % grid) + grid) % grid; y < height; y += grid) {
      lines.push(-1, 1 - y / height * 2, 1, 1 - y / height * 2);
    }
    gl.useProgram(this.program); gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(lines),gl.STREAM_DRAW);
    const loc = gl.getAttribLocation(this.program,'position');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    const color = gl.getUniformLocation(this.program,'ink');
    if (dark) gl.uniform4f(color,0.17,0.22,0.29,1); else gl.uniform4f(color,0.84,0.88,0.93,1);
    gl.drawArrays(gl.LINES,0,lines.length / 2);
  }
}
