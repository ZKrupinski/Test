/* Human Fishing / independent WebGL2 FX light pass.
 * Original sprites and the Canvas 2D world remain authoritative.
 * Only explicitly selected effect copies are processed: fish, UI and the
 * opaque foreground water surface never enter this source texture.
 */
(function(root){
 'use strict';
 var VERSION='20261110-fxgl-v1';
 var VERT='#version 300 es\n'+
  'in vec2 a_position;out vec2 v_uv;void main(){v_uv=(a_position+1.0)*0.5;gl_Position=vec4(a_position,0.0,1.0);}';
 var BRIGHT='#version 300 es\nprecision highp float;\n'+
  'in vec2 v_uv;uniform sampler2D u_source;out vec4 pixel;\n'+
  'void main(){vec4 c=texture(u_source,v_uv);float y=dot(c.rgb,vec3(0.2126,0.7152,0.0722));'+
  'float energy=c.a*smoothstep(0.43,0.92,y);pixel=vec4(c.rgb*energy,energy);}';
 var BLUR='#version 300 es\nprecision highp float;\n'+
  'in vec2 v_uv;uniform sampler2D u_source;uniform vec2 u_dir;uniform float u_step;uniform int u_finish;out vec4 pixel;\n'+
  'void main(){vec4 sum=texture(u_source,v_uv)*0.227027;'+
  'for(int i=1;i<=4;i++){float w=i==1?0.194595:i==2?0.121622:i==3?0.054054:0.016216;'+
  'vec2 off=u_dir*(float(i)*u_step);sum+=w*(texture(u_source,v_uv+off)+texture(u_source,v_uv-off));}'+
  'if(u_finish==1){float a=clamp(sum.a,0.0,1.0);pixel=vec4(clamp(sum.rgb/max(sum.a,0.0001),0.0,1.0),a);}else pixel=sum;}';
 function create(options){
  options=options||{};
  var width=options.width||1280,height=options.height||720;
  var add=options.addStrength===undefined?.30:Math.max(0,Math.min(1,options.addStrength));
  var bloom=options.bloomStrength===undefined?.35:Math.max(0,Math.min(1,options.bloomStrength));
  var radius=options.radius===undefined?10:Math.max(0,Math.min(24,options.radius));
  var nav=typeof navigator==='undefined'?{}:navigator;
  var coarse=false;
  try{coarse=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches}catch(e){}
  var lowPower=!!options.lowPower||coarse||Number(nav.hardwareConcurrency||8)<=4||
   (Number(nav.deviceMemory||8)<=4)||/Android|iPhone|iPad/i.test(nav.userAgent||'');
  // One-sixth-resolution bloom on touch/low-memory devices; quarter on desktop.
  var factor=lowPower?6:4,gw=Math.max(1,Math.ceil(width/factor)),gh=Math.max(1,Math.ceil(height/factor));
  var source=document.createElement('canvas');source.width=width;source.height=height;
  var painter=source.getContext('2d',{alpha:true});
  var output=document.createElement('canvas');output.width=gw;output.height=gh;
  var gl=null,ready=false,active=false,programs=null,sourceTex=null,buffer=null,targets=[];
  var api={version:VERSION,context:null,lowPower:lowPower,scale:factor,
   settings:{addStrength:add,bloomStrength:bloom,radius:radius},
   get available(){return ready},
   get outputSize(){return [gw,gh]},
   beginFrame:beginFrame,composite:composite};
  if(!painter)return api;
  try{gl=output.getContext('webgl2',{alpha:true,premultipliedAlpha:false,
   preserveDrawingBuffer:true,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});}catch(e){}
  if(!gl)return api;
  output.addEventListener('webglcontextlost',function(e){e.preventDefault();ready=false;api.context=null;active=false});
  output.addEventListener('webglcontextrestored',function(){try{initialize()}catch(e){ready=false;api.context=null}});
  function compile(type,sourceText){
   var shader=gl.createShader(type);
   gl.shaderSource(shader,sourceText);gl.compileShader(shader);
   if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('FX GLSL: '+gl.getShaderInfoLog(shader));
   return shader;
  }
  function program(fragment){
   var p=gl.createProgram(),vs=compile(gl.VERTEX_SHADER,VERT),fs=compile(gl.FRAGMENT_SHADER,fragment);
   gl.attachShader(p,vs);gl.attachShader(p,fs);
   gl.bindAttribLocation(p,0,'a_position');gl.linkProgram(p);
   gl.deleteShader(vs);gl.deleteShader(fs);
   if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('FX link: '+gl.getProgramInfoLog(p));
   return {handle:p,source:gl.getUniformLocation(p,'u_source'),dir:gl.getUniformLocation(p,'u_dir'),
    step:gl.getUniformLocation(p,'u_step'),finish:gl.getUniformLocation(p,'u_finish')};
  }
  function texture(w,h,renderTarget){
   var t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   if(renderTarget)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
   return t;
  }
  function target(){
   var tex=texture(gw,gh,true),fbo=gl.createFramebuffer();
   gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
   gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
   if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('FX framebuffer incomplete');
   return {texture:tex,framebuffer:fbo};
  }
  function initialize(){
   ready=false;api.context=null;
   programs={bright:program(BRIGHT),blur:program(BLUR)};
   buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
   sourceTex=texture(width,height,false);
   targets=[target(),target()];
   gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,gw,gh);
   gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);
   ready=true;api.context=painter;
  }
  function beginFrame(camera){
   active=ready;if(!active)return false;
   painter.setTransform(1,0,0,1,0,0);
   painter.globalCompositeOperation='source-over';painter.globalAlpha=1;
   painter.clearRect(0,0,width,height);
   if(camera&&(camera.x||camera.y)){
    painter.translate(width*.5,height*.5);painter.scale(1.016,1.016);
    painter.translate(-width*.5+camera.x,-height*.5+camera.y);
   }
   return true;
  }
  function drawPass(info,input,framebuffer,dirX,dirY,step,finish){
   gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
   gl.viewport(0,0,gw,gh);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
   gl.useProgram(info.handle);
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(0);
   gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,input);
   gl.uniform1i(info.source,0);
   if(info.dir!==null)gl.uniform2f(info.dir,dirX,dirY);
   if(info.step!==null)gl.uniform1f(info.step,step);
   if(info.finish!==null)gl.uniform1i(info.finish,finish);
   gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
  function composite(worldCtx){
   if(!active||!ready)return false;
   active=false;
   try{
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
    gl.bindTexture(gl.TEXTURE_2D,sourceTex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
    gl.disable(gl.BLEND);
    drawPass(programs.bright,sourceTex,targets[0].framebuffer,0,0,0,0);
    // Gaussian taps cover ~10 source pixels at radius=10, including
    // the two-dimensional downsampling factor on low-power devices.
    var spread=radius/(factor*4);
    drawPass(programs.blur,targets[0].texture,targets[1].framebuffer,1/gw,0,spread,0);
    drawPass(programs.blur,targets[1].texture,null,0,1/gh,spread,1);
    // Main sprites were already drawn normally at the correct scene depth.
    // These are EXTRA light-only passes, never a replacement rendering.
    worldCtx.save();
    worldCtx.setTransform(1,0,0,1,0,0);
    worldCtx.globalCompositeOperation='lighter';
    worldCtx.globalAlpha=add;
    worldCtx.drawImage(source,0,0,width,height);
    worldCtx.globalAlpha=bloom;
    worldCtx.drawImage(output,0,0,width,height);
    worldCtx.restore();
    return true;
   }catch(e){
    // WebGL errors or context loss never hide original 2D effects.
    ready=false;api.context=null;
    return false;
   }
  }
  try{initialize()}catch(e){ready=false;api.context=null}
  return api;
 }
 root.HumanFishingFXShader={version:VERSION,create:create};
})(typeof window!=='undefined'?window:{});