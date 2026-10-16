// A small 2D canvas rather than a WebGL engine. Capped DPR and 30fps on mobile.
export function createUniverse(canvas) {
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let w=0,h=0,visible=true,frame=0,last=0,images=[];
  let time=0;
  const stars=Array.from({length:100},(_,i)=>({x:Math.sin(i*127.1)*0.5+0.5,y:Math.sin(i*311.7)*0.5+0.5,r:i%4===0?1.1:0.55}));
  function resize(){w=canvas.clientWidth;h=canvas.clientHeight;const d=Math.min(devicePixelRatio||1,1.5);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);draw();}
  function draw(){
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#191714';ctx.fillRect(0,0,w,h);
    for(const s of stars){ctx.globalAlpha=0.15+s.r*0.24;ctx.fillStyle='#f4e4cd';ctx.fillRect(s.x*w,s.y*h,s.r,s.r);}ctx.globalAlpha=1;
    const mobile=w<700,cx=mobile?w*0.72:w*0.72,cy=mobile?h*0.26:h*0.51,r=Math.min(w*(mobile?0.21:0.18),205);
    const halo=ctx.createRadialGradient(cx,cy,r*0.9,cx,cy,r*2.3);halo.addColorStop(0,'#bd845439');halo.addColorStop(0.4,'#9a663216');halo.addColorStop(1,'#19171400');ctx.fillStyle=halo;ctx.fillRect(0,0,w,h);
    ctx.save();ctx.translate(cx,cy);ctx.rotate(-0.18);
    // Gravitational lens: the upper halo and inclined accretion disk.
    ctx.strokeStyle='#c29361';ctx.lineWidth=1;ctx.shadowColor='#cf9763';ctx.shadowBlur=16;
    for(let j=0;j<15;j++){ctx.globalAlpha=0.08+(15-j)*0.015;ctx.beginPath();ctx.ellipse(0,0,r*(1+j*0.013),r*(1+j*0.013),0,Math.PI,Math.PI*2);ctx.stroke();}
    ctx.globalAlpha=1;
    for(let j=0;j<24;j++){ctx.globalAlpha=0.1+(24-j)*0.012;ctx.lineWidth=j%4===0?1.8:0.65;ctx.beginPath();ctx.ellipse(0,0,r*(1.05+j*0.055),r*(0.17+j*0.009),0,0,Math.PI*2);ctx.stroke();}
    ctx.shadowBlur=0;ctx.globalAlpha=1;
    ctx.fillStyle='#100f0e';ctx.beginPath();ctx.arc(0,0,r*0.92,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#edc495';ctx.globalAlpha=0.65;ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,0,r*0.95,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
    for(let i=0;i<36;i++){
      const a=i/36*Math.PI*2+time*0.035,rr=r*(1.18+(i%3)*0.26),x=Math.cos(a)*rr,y=Math.sin(a)*rr*0.29;
      if(y<0&&Math.abs(x)<r*0.91)continue;
      const size=(mobile?10:17)+(i%3)*3;ctx.save();ctx.translate(x,y);ctx.rotate(a*0.12);ctx.fillStyle=['#b8a389','#87624c','#d4c2aa'][i%3];ctx.globalAlpha=0.62;
      ctx.fillRect(-size/2,-size/2,size,size*1.22);
      if(images.length){const im=images[i%images.length];const edge=Math.min(im.width,im.height);ctx.drawImage(im,(im.width-edge)/2,(im.height-edge)/2,edge,edge,-size/2+1,-size/2+1,size-2,size-2);}
      else {ctx.strokeStyle='#e4d0b4';ctx.lineWidth=0.6;ctx.strokeRect(-size/2+2,-size/2+2,size-4,size-4);}
      ctx.restore();
    }
    ctx.restore();
  }
  function tick(now){frame=0;if(document.hidden||!visible||motion.matches)return;if(now-last>33){time=now/1000;draw();last=now;}frame=requestAnimationFrame(tick);}
  function resume(){if(!frame&&!document.hidden&&visible&&!motion.matches)frame=requestAnimationFrame(tick);else if(motion.matches)draw();}
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)resume();else{cancelAnimationFrame(frame);frame=0;}});observer.observe(canvas);
  new ResizeObserver(resize).observe(canvas);
  document.addEventListener('visibilitychange',resume);motion.addEventListener('change',()=>{cancelAnimationFrame(frame);frame=0;resume();});
  let photoGeneration=0;
  window.addEventListener('photoschanged',async e=>{const generation=++photoGeneration;const next=await Promise.all(e.detail.map(src=>new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=src;})));if(generation!==photoGeneration)return;images=next.filter(Boolean);draw();});
  resize();resume();
}
