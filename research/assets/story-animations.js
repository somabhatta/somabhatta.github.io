/* Purpose-built scientific stories. Schematic response models, not fitted data.
   Loaded after page-specific definitions to replace seven core scene types. */
(function () {
    'use strict';
    const {register, u, C, glauber} = window.Anim;
    const P = {ink:'#17324f',muted:'#536a80',line:'#dce6ee',blue:'#2168b4',teal:'#076d78',orange:'#a94c0e',purple:'#7255a3',red:'#ad2e3a'};
    function text(ctx,s,x,y,size=14,color=P.ink,align='left',weight=500) {
        ctx.save();ctx.font=`${weight} ${size}px Inter, Arial, sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillText(s,x,y);ctx.restore();
    }
    function wrapped(ctx,s,x,y,width,size=13,color=P.muted,align='left',lineHeight=19,weight=500) {
        ctx.save();ctx.font=`${weight} ${size}px Inter, Arial, sans-serif`;
        const lines=[];let line='';
        for(const word of s.split(/\s+/)){const next=line?line+' '+word:word;if(ctx.measureText(next).width>width&&line){lines.push(line);line=word;}else line=next;}
        if(line)lines.push(line);ctx.restore();
        lines.forEach((l,i)=>text(ctx,l,x,y+i*lineHeight,size,color,align,weight));return lines.length*lineHeight;
    }
    function round(ctx,x,y,w,h,r=12,fill='#fff',stroke=P.line){
        ctx.save();u.roundRect(ctx,x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}ctx.restore();
    }
    function dot(ctx,x,y,r,col,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();}
    function dashed(ctx,x1,y1,x2,y2,col=P.muted){ctx.save();ctx.strokeStyle=col;ctx.lineWidth=1.2;ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();}
    function line(ctx,pts,col=P.blue,width=2.5,dash){u.line(ctx,pts,col,width,dash);}
    function clip(ctx,b,fn){ctx.save();ctx.beginPath();ctx.rect(b.x,b.y,b.w,b.h);ctx.clip();fn();ctx.restore();}
    function pill(ctx,s,x,y,col=P.teal){ctx.save();ctx.font='600 12px Inter, Arial, sans-serif';const w=ctx.measureText(s).width+20;round(ctx,x,y,w,25,12,'#fff',col);text(ctx,s,x+10,y+17,12,col,'left',600);ctx.restore();return w;}
    function header(ctx,W,title,note){text(ctx,title,24,30,18,P.ink,'left',700);if(note)text(ctx,note,24,51,12,P.muted);}
    function footer(ctx,W,H,s){round(ctx,18,H-47,W-36,32,8,'#edf4fa',null);text(ctx,s,W/2,H-26,13,P.ink,'center',600);}
    function envelope(t,a,b){return u.ease(u.seg(t,a,b));}
    function dots(seed,n){const rand=u.rng(seed);return Array.from({length:n},()=>({a:rand()*2*Math.PI,r:Math.sqrt(rand()),v:.72+.28*rand()}));}
    function drop(ctx,cx,cy,rx,ry,color=P.orange,alpha=1,angle=0){
        ctx.save();ctx.globalAlpha*=alpha;ctx.translate(cx,cy);ctx.rotate(angle);
        const g=ctx.createRadialGradient(-rx*.2,-ry*.25,1,0,0,Math.max(rx,ry));
        g.addColorStop(0,'#fff3d6');g.addColorStop(.65,color+'b8');g.addColorStop(1,color+'30');
        ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=1.7;ctx.stroke();
        ctx.strokeStyle=color+'55';ctx.lineWidth=.8;
        [.48,.73].forEach(k=>{ctx.beginPath();ctx.ellipse(0,0,rx*k,ry*k,0,0,Math.PI*2);ctx.stroke();});ctx.restore();
    }
    function outline(ctx,cx,cy,rx,ry){ctx.save();ctx.strokeStyle='#95aabd';ctx.lineWidth=1.2;ctx.setLineDash([4,5]);ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
    function gauge(ctx,x,y,w,label,value,col){text(ctx,label,x,y-8,12,P.muted);round(ctx,x,y,w,7,3,'#e5edf3',null);round(ctx,x,y,Math.max(7,w*u.clamp(value,0,1)),7,3,col,null);}
    function axes(ctx,b,xrange,yrange,opts={}){
        const X=v=>b.x+(v-xrange[0])/(xrange[1]-xrange[0])*b.w;
        const Y=v=>b.y+b.h-(v-yrange[0])/(yrange[1]-yrange[0])*b.h;
        round(ctx,b.x,b.y,b.w,b.h,0,'#fff',P.line);
        for(const v of opts.yticks||[]){const y=Y(v);line(ctx,[[b.x,y],[b.x+b.w,y]],'#e7edf3',1);text(ctx,String(v),b.x-8,y+4,11,P.muted,'right');}
        for(const v of opts.xticks||[]){text(ctx,String(v),X(v),b.y+b.h+17,11,P.muted,'center');}
        if(yrange[0]<0&&yrange[1]>0)dashed(ctx,b.x,Y(0),b.x+b.w,Y(0),'#8fa3b7');
        if(opts.xlabel)text(ctx,opts.xlabel,b.x+b.w/2,b.y+b.h+36,12,P.muted,'center');
        return {X,Y};
    }

    register('twoflows',{
        duration:12,aspect:16/10,
        phases:[{t:0,label:'Compare two properties of the initial droplet: its shape and its size.'},{t:3,preview:5.5,label:'Pressure gradients convert geometry into outward motion.'},{t:7,preview:9,label:'Shape changes the angular pattern; size changes the overall momentum scale.'}],
        controls:[{key:'ecc',label:'Elongation',min:0,max:.5,step:.05,value:.3,fmt:v=>Number(v).toFixed(2),resetup:false},{key:'compact',label:'Compactness',min:0,max:1,step:.05,value:.6,fmt:v=>Math.round(v*100)+'%',resetup:false}],
        setup(){return {particles:dots(4,54)};},
        draw(ctx,t,s,W,H,p){
            header(ctx,W,'Two responses to the same pressure','Transverse view · shape changes direction; size changes the overall push');
            const y=72,h=H-135,gap=14,pw=(W-48-gap)/2,cy=y+h*.51;
            const grow=envelope(t,3,7),emit=envelope(t,6,9),fade=1-envelope(t,11,12);
            const ecc=p.ecc??.3,compact=p.compact??.6;
            for(let i=0;i<2;i++){
                const x=24+i*(pw+gap),cx=x+pw/2;round(ctx,x,y,pw,h,12,'#fff');
                text(ctx,i?'SIZE':'SHAPE',x+16,y+24,11,i?P.teal:P.blue,'left',700);
                text(ctx,i?'Radial response':'Elliptic response',x+16,y+46,17,P.ink,'left',700);
                const R=Math.min(pw*.14,h*.12),areaScale=i?1.05-.4*compact:1;
                const rx=i?R*areaScale:R*Math.sqrt(1-ecc),ry=i?R*areaScale:R/Math.sqrt(1-ecc);
                if(i)outline(ctx,cx,cy,R*1.1,R*1.1);
                else outline(ctx,cx,cy,R,R);
                const k=1+grow*.2;
                drop(ctx,cx,cy,rx*k,ry*k,i?P.teal:P.orange,.95-emit*.38);
                if(grow>0){
                    for(let j=0;j<8;j++){
                        const a=j*Math.PI/4,strength=i?.55+.55*compact:.75*(1+ecc*Math.cos(2*a));
                        const ax=cx+rx*k*Math.cos(a),ay=cy+ry*k*Math.sin(a),L=(15+20*strength)*grow;
                        u.arrow(ctx,ax,ay,ax+L*Math.cos(a),ay+L*Math.sin(a),i?P.teal:P.blue,2,6);
                    }
                }
                clip(ctx,{x:x+2,y:y+56,w:pw-4,h:h-109},()=>s.particles.forEach(q=>{
                    const speed=i?.65+.55*compact:.8*(1+ecc*Math.cos(2*q.a));
                    const d=emit*R*1.05*q.v*speed;
                    const px=cx+(rx*k+d)*Math.cos(q.a),py=cy+(ry*k+d)*Math.sin(q.a);
                    if(emit>0){line(ctx,[[px-7*emit*Math.cos(q.a),py-7*emit*Math.sin(q.a)],[px,py]],i?P.teal:P.blue,1.3);dot(ctx,px,py,2.2,i?P.teal:P.blue,fade*.8);}
                }));
                const msg=i?'More compact → stronger radial push':'Shorter axis → stronger pressure gradient';
                wrapped(ctx,msg,cx,y+h-36,pw-28,12,i?P.teal:P.blue,'center',17,600);
            }
            footer(ctx,W,H,grow<.1?'Initial geometry sets the pressure gradients':'Shape controls direction; size controls the overall push');
        }
    });

    register('spectrum',{
        duration:12,aspect:16/11,
        phases:[{t:0,label:'Start from the average event: the solid and dashed spectra coincide.'},{t:1.5,label:'Stronger radial push transfers relative yield from low to high transverse momentum.'},{t:4,label:'Follow the continuous change from a harder to a softer spectrum.'},{t:6,label:'Weaker radial push reverses the pattern: more low-pT particles and fewer high-pT particles.'},{t:9,label:'The event returns smoothly to the average spectrum.'}],
        controls:[{key:'amplitude',label:'Fluctuation strength',min:.02,max:.18,step:.01,value:.12,fmt:v=>Math.round(v*100)+'%',resetup:false}],
        setup(){return{};},
        draw(ctx,t,s,W,H,p){
            const a=t<1.5?envelope(t,0,1.5):t<4?1:t<6?1-2*envelope(t,4,6):t<9?-1:-1+envelope(t,9,12);
            const mode=p.mode||'shape',T0=p.T0||.45,amp=p.amplitude??.12,T=T0*(1+(mode==='mult'?0:amp*a)),M=mode==='shape'?1:1+.25*a;
            const col=a>=0?P.red:P.blue;
            header(ctx,W,'Watch the momentum spectrum respond',mode==='shape'?'Same total yield · a change in the momentum distribution':'Yield and spectral shape can fluctuate separately');
            const side=Math.max(170,W*.24),b1={x:66,y:96,w:W-side-102,h:(H-244)*.52},b2={x:66,y:96+(H-244)*.52+53,w:W-side-102,h:(H-244)*.48};
            text(ctx,mode==='shape'?'Normalized spectrum':'Event spectrum',b1.x,b1.y-13,13,P.ink,'left',600);
            const m1=axes(ctx,b1,[0,2.7],[0,1.15],{yticks:[0,.5,1],xticks:[]});
            const f=(x,tt,m)=>m*x*Math.exp(-x/tt)/(tt*tt);
            const avg=[],ev=[],rel=[];
            const m2=axes(ctx,b2,[0,2.7],[-1,2],{yticks:[-1,0,1,2],xticks:[0,1,2],xlabel:'Transverse momentum pT (GeV)'});
            text(ctx,'Relative change from the average',b2.x,b2.y-13,13,P.ink,'left',600);
            for(let j=1;j<=150;j++){const x=2.7*j/150;avg.push([m1.X(x),m1.Y(f(x,T0,1))]);ev.push([m1.X(x),m1.Y(f(x,T,M))]);rel.push([m2.X(x),m2.Y(f(x,T,M)/f(x,T0,1)-1)]);}
            clip(ctx,b1,()=>{line(ctx,avg,'#8195a9',2,[5,4]);line(ctx,ev,col,3);});
            clip(ctx,b2,()=>line(ctx,rel,col,3));
            const pivot=Math.abs(T-T0)<1e-8?2*T0:(2*Math.log(T/T0)-Math.log(M))/(1/T0-1/T);
            if(mode!=='mult'&&pivot>0&&pivot<2.7){dashed(ctx,m2.X(pivot),b2.y,m2.X(pivot),b2.y+b2.h,'#94a7b8');dot(ctx,m2.X(pivot),m2.Y(0),4,col);}
            const sx=W-side-16,cx=sx+side/2;
            round(ctx,sx,86,side,H-150,12,'#f1f6fa',null);
            wrapped(ctx,Math.abs(a)<.06?'Average event':a>0?'Stronger push':'Weaker push',cx,111,side-20,16,col,'center',21,700);
            const cy=H*.39,R=29+(a+1)*8;
            drop(ctx,cx,cy,R,R,col);
            for(let j=0;j<8;j++){const an=j*Math.PI/4,L=12+(a+1)*9;u.arrow(ctx,cx+R*Math.cos(an),cy+R*Math.sin(an),cx+(R+L)*Math.cos(an),cy+(R+L)*Math.sin(an),col,1.8,5);}
            text(ctx,'Mean pT',cx,H*.56,12,P.muted,'center');text(ctx,(2*T).toFixed(2)+' GeV',cx,H*.56+26,23,col,'center',700);
            text(ctx,'illustrative spectrum',cx,H*.56+45,11,P.muted,'center');
            const lowRatio=f(.3,T,M)/f(.3,T0,1),highRatio=f(2,T,M)/f(2,T0,1);
            text(ctx,'Low pT '+(Math.abs(lowRatio-1)<.01?'≈':lowRatio>1?'↑':'↓'),cx,H*.72,14,P.ink,'center',600);
            text(ctx,'High pT '+(Math.abs(highRatio-1)<.01?'≈':highRatio>1?'↑':'↓'),cx,H*.72+22,14,P.ink,'center',600);
            text(ctx,'Dashed: average event',cx,H-82,11,P.muted,'center');
            footer(ctx,W,H,mode==='shape'?'A shared radial fluctuation changes many momentum bins together':'Shape changes tilt the spectrum; yield changes add an overall offset');
        }
    });

    register('subevents',{
        duration:12,aspect:16/10,
        phases:[{t:0,label:'Particles from one collision populate both negative and positive pseudorapidity.'},{t:3,preview:4.5,label:'Choose two separated subevents. The grey interval is excluded.'},{t:6,preview:8,label:'Correlate spectrum fluctuations in A with mean momentum fluctuations in B.'},{t:9,label:'A larger gap suppresses short-range pairs.'}],
        controls:[{key:'gap',label:'Pseudorapidity gap Δη',min:0,max:3,step:.1,value:1,fmt:v=>Number(v).toFixed(1),resetup:false}],
        setup(){const r=u.rng(13);return {pts:Array.from({length:66},()=>({eta:5*r()-2.5,y:r()}))};},
        draw(ctx,t,s,W,H,p){
            header(ctx,W,'Separate local pairs from long-range correlations','Pseudorapidity view · compare particles in two separated regions');
            const x=42,w=W-84,top=131,h=H-255,X=eta=>x+(eta+2.5)/5*w,gap=(p.gap??1)*envelope(t,2,3.5),split=envelope(t,2,3.3),bridge=envelope(t,6,7.5);
            const aW=(2.5-gap/2)/5*w,bX=X(gap/2);
            round(ctx,x,top,aW,h,8,'#e9f2fd',null);round(ctx,bX,top,aW,h,8,'#fff0e3',null);
            if(gap>0){round(ctx,X(-gap/2),top,gap/5*w,h,0,'#eef1f4',null);clip(ctx,{x:X(-gap/2),y:top,w:gap/5*w,h},()=>{for(let k=-h;k<gap/5*w+h;k+=14)line(ctx,[[X(-gap/2)+k,top],[X(-gap/2)+k+h,top+h]],'#d9e1e8',1);});}
            const cA=x+aW/2,cB=bX+aW/2;
            text(ctx,'SUBEVENT A',cA,top-19,12,P.blue,'center',700);text(ctx,'SUBEVENT B',cB,top-19,12,P.orange,'center',700);
            s.pts.forEach((q,i)=>{const keep=Math.abs(q.eta)>=gap/2,col=keep?(q.eta<0?P.blue:P.orange):'#9eafbd';const yy=top+14+q.y*(h-28);dot(ctx,X(q.eta),yy,3.3,col,keep?1:1-.78*split);});
            for(const eta of [-2,-1,0,1,2])text(ctx,String(eta),X(eta),top+h+21,12,P.muted,'center');
            text(ctx,'Pseudorapidity η',W/2,top+h+42,12,P.muted,'center');
            if(bridge>0){ctx.save();ctx.globalAlpha=bridge;const yy=top-47;dashed(ctx,cA,yy,cB,yy,P.teal);u.arrow(ctx,cB-10,yy,cB,yy,P.teal,2,6);dot(ctx,u.lerp(cA,cB,(t-6)%2/2),yy,4,P.teal);ctx.restore();text(ctx,'Compare the same event across A and B',W/2,yy-12,13,P.teal,'center',600);}
            const pairY=top+h*.57,pa=X(-.17),pb=X(.17),rejected=gap>.34;
            line(ctx,[[pa,pairY],[pb,pairY-12]],P.purple,2,[3,3]);dot(ctx,pa,pairY,5,P.purple,rejected?.35:1);dot(ctx,pb,pairY-12,5,P.purple,rejected?.35:1);
            wrapped(ctx,p.leftLabel||'A: spectrum shape',cA,top+h+67,Math.max(120,aW),12,P.blue,'center',16,600);
            wrapped(ctx,p.rightLabel||'B: mean transverse momentum',cB,top+h+67,Math.max(120,aW),12,P.orange,'center',16,600);
            footer(ctx,W,H,gap<.35?'No gap: a short-range pair can enter both subevents':'Gap Δη = '+gap.toFixed(1)+' · short-range pairs are suppressed');
        }
    });

    register('scaling',{
        duration:12,aspect:16/11,
        phases:[{t:0,label:'Keep the raw curves on the left as a reference: their amplitudes differ.'},{t:3,label:'On the right, divide each illustrative curve by its own amplitude v₀.'},{t:8,label:'The normalized curves overlap: one common response shape can describe all these schematic centralities.'}],
        setup(){return{};},
        draw(ctx,t,s,W,H,p){
            header(ctx,W,'Different amplitudes. One response shape.','The original curves stay visible while the normalized comparison is built');
            const n=p.n||6,cols=[P.red,P.orange,'#ac8911',P.teal,P.blue,P.purple],pw=(W-124)/2,b1={x:55,y:124,w:pw,h:H-273},b2={x:W/2+35,y:124,w:pw,h:H-273};
            const shape=x=>Math.log(x)*(2.4-.28*Math.log(x)),amps=Array.from({length:n},(_,i)=>.015+.011*i);
            const m1=axes(ctx,b1,[0,1],[-.16,.35],{}),m2=axes(ctx,b2,[0,1],[-2.3,5],{});
            text(ctx,p.ylabel1||'Raw v₀(pT)',b1.x,99,15,P.ink,'left',700);text(ctx,p.ylabel2||'Normalized v₀(pT) / v₀',b2.x,99,15,P.ink,'left',700);
            [b1,b2].forEach(b=>{[.5,1,2,5,10].forEach(v=>text(ctx,String(v),b.x+Math.log(v/.5)/Math.log(20)*b.w,b.y+b.h+18,11,P.muted,'center'));text(ctx,'pT (GeV, log scale)',b.x+b.w/2,b.y+b.h+38,12,P.muted,'center');});
            for(let i=0;i<n;i++){
                const col=cols[i%cols.length],raw=[],scaled=[],reveal=envelope(t,3+i*.65,4+i*.65);
                for(let j=0;j<=100;j++){const z=j/100,x=.5*Math.pow(20,z);raw.push([m1.X(z),m1.Y(amps[i]*shape(x))]);scaled.push([m2.X(z),m2.Y(shape(x))]);}
                clip(ctx,b1,()=>line(ctx,raw,col,2.3));
                if(reveal>0)clip(ctx,b2,()=>{ctx.globalAlpha=reveal;line(ctx,scaled.slice(0,Math.max(2,Math.round(reveal*101))),col,2.6);const z=.28+i*.095;dot(ctx,m2.X(z),m2.Y(shape(.5*Math.pow(20,z))),4,col);});
                const lx=24+(i%3)*(W-48)/3,ly=H-94+Math.floor(i/3)*21;
                line(ctx,[[lx,ly-4],[lx+18,ly-4]],col,3);text(ctx,(p.labels||[])[i]||'Class '+(i+1),lx+25,ly,12,P.muted);
            }
            if(t<3)wrapped(ctx,'Divide by the amplitude of each curve',b2.x+b2.w/2,b2.y+b2.h*.42,b2.w-30,15,P.muted,'center',22,600);
            footer(ctx,W,H,t<8?'Normalization removes amplitude differences':'After scaling, the curves share the same shape');
        }
    });

    register('viscosity',{
        duration:12,aspect:16/10,
        phases:[{t:0,label:'Start with the same illustrative droplet in both panels.'},{t:3,preview:5.5,label:'During expansion, bulk viscosity contributes a pressure opposing the expansion.'},{t:8,preview:9.5,label:'Bulk viscosity reduces the outward response in this illustration.'}],
        setup(){return {particles:dots(17,36)};},
        draw(ctx,t,s,W,H,p){
            header(ctx,W,'How bulk viscosity changes the outward response','Matched initial droplets · arrows and trajectories are qualitative');
            const pw=(W-62)/2,y=75,h=H-135,cy=y+h*.48,expand=envelope(t,2.5,8.5);
            for(let i=0;i<2;i++){
                const x=24+i*(pw+14),cx=x+pw/2,col=i?P.blue:P.orange,push=i?.6:1,R=Math.min(pw*.15,h*.12),r=R*(1+expand*.35*push);
                round(ctx,x,y,pw,h,12,'#fff');text(ctx,i?(p.rightTitle||'With bulk viscosity'):(p.leftTitle||'Without bulk viscosity'),cx,y+28,16,P.ink,'center',700);
                outline(ctx,cx,cy,R,R);drop(ctx,cx,cy,r,r,col,.95-.32*expand);
                for(let j=0;j<8;j++){const a=j*Math.PI/4,L=expand*push*31;u.arrow(ctx,cx+r*Math.cos(a),cy+r*Math.sin(a),cx+(r+L)*Math.cos(a),cy+(r+L)*Math.sin(a),col,2,6);}
                s.particles.forEach(q=>{const d=r+expand*q.v*push*R*.9,px=cx+d*Math.cos(q.a),py=cy+d*Math.sin(q.a);if(expand>.1){line(ctx,[[px-7*expand*Math.cos(q.a),py-7*expand*Math.sin(q.a)],[px,py]],col,1);dot(ctx,px,py,2,col,.8);}});
                gauge(ctx,x+20,y+h-53,pw-40,'Outward response (qualitative)',expand*push,col);
                text(ctx,i?'Expansion opposed':'Reference response',cx,y+h-19,12,col,'center',600);
            }
            footer(ctx,W,H,'Measured v₀(pT) can constrain this response through model comparisons');
        }
    });

    register('flow-momentum-correlations-orient',{
        duration:14,aspect:16/11,
        phases:[{t:0,label:'Compare two orientations of the same prolate nuclei in a central collision.'},{t:3,preview:5.5,label:'Viewed along the beam: tip–tip is compact and round; body–body is broader and elongated.'},{t:7,preview:9.5,label:'The compact overlap gives a larger momentum scale. The elongated overlap gives more elliptic flow.'},{t:11,label:'This geometric tendency pairs larger v₂ with smaller [pT], contributing a negative correlation.'}],
        setup(){return{};},
        draw(ctx,t,s,W,H){
            header(ctx,W,'Orientation links shape and compactness','Matched prolate nuclei · central-collision geometry, shown schematically');
            const pw=(W-62)/2,y=77,h=H-137,grow=envelope(t,3,5),response=envelope(t,7,9);
            for(let i=0;i<2;i++){
                const x=24+i*(pw+14),cx=x+pw/2,col=i?P.purple:P.teal;round(ctx,x,y,pw,h,12,'#fff');
                text(ctx,i?'Body–body':'Tip–tip',cx,y+28,17,P.ink,'center',700);
                const iy=y+83;
                [-1,1].forEach(d=>drop(ctx,cx+d*43,iy,i?13:31,i?28:13,d<0?P.blue:P.purple,.75));
                text(ctx,'Orientation sketch · beam ↔',cx,y+49,11,P.muted,'center');
                const fy=y+h*.58,rx=i?51:31,ry=i?31:31;
                drop(ctx,cx,fy,rx,ry,col,.25+.7*grow);
                text(ctx,'Overlap viewed along the beam',cx,fy-60,11,P.muted,'center');
                if(response>0)for(let j=0;j<8;j++){const a=j*Math.PI/4,L=response*(i?14+16*Math.sin(a)**2:29);u.arrow(ctx,cx+rx*Math.cos(a),fy+ry*Math.sin(a),cx+(rx+L)*Math.cos(a),fy+(ry+L)*Math.sin(a),col,1.8,5);}
                const gy=y+h-56,bw=pw*.36,bx=x+pw*.54;
                text(ctx,'Elliptic flow v₂',bx-10,gy+5,12,P.muted,'right');round(ctx,bx,gy-3,bw,7,3,'#e5edf3',null);round(ctx,bx,gy-3,Math.max(7,bw*(i?.85:.12)*response),7,3,P.orange,null);
                text(ctx,'Mean pT',bx-10,gy+28,12,P.muted,'right');round(ctx,bx,gy+20,bw,7,3,'#e5edf3',null);round(ctx,bx,gy+20,Math.max(7,bw*(i?.35:.85)*response),7,3,P.teal,null);
            }
            footer(ctx,W,H,'Broader and more elongated → larger v₂, smaller mean pT');
        }
    });

    register('collision',{
        duration:14,aspect:16/10,
        phases:[{t:0,label:'Look along the beam: two nuclei overlap in the transverse plane.'},{t:3,preview:4,label:'Highlight participating nucleons. Spectators do not join the hot overlap.'},{t:5.5,preview:8,label:'The participant region is represented by an expanding droplet.'},{t:9,preview:11.5,label:'Pressure converts the initial geometry into an illustrative pattern of outgoing momenta.'}],
        setup(p,W,H,old){
            const seed=old?.seed||23,st={seed};
            st.make=()=>{const rand=u.rng(st.seed);st.ev=glauber.event({nucleus:p.nucleus||'Pb208',b:p.b??4,sigma:p.sigma},rand);st.particles=dots(st.seed+7,64);};st.make();return st;
        },
        onLoop(s,p){if(p.newEvents!==false){s.seed+=7919;s.make();}},
        draw(ctx,t,s,W,H,p){
            const labels={Pb208:'Pb + Pb',U238:'U + U',O16:'O + O',Xe129:'Xe + Xe',Au197:'Au + Au'},o=s.ev.obs;
            header(ctx,W,(labels[p.nucleus]||labels.Pb208)+' · from geometry to motion','Beam view · toy Glauber geometry and a schematic fluid response');
            const side=176,b={x:24,y:75,w:W-side-62,h:H-139},cx=b.x+b.w/2,cy=b.y+b.h/2;
            round(ctx,b.x,b.y,b.w,b.h,12,'#fff');
            const all=[...s.ev.A,...s.ev.B],extent=Math.max(5,...all.map(q=>Math.hypot(q[0],q[1]))),scale=Math.min(b.w,b.h)*.39/extent;
            const highlight=envelope(t,2.5,3.5),fluid=envelope(t,5.5,7),expand=envelope(t,7,10),emit=envelope(t,9,11.8),fade=1-envelope(t,13,14);
            clip(ctx,b,()=>{
                for(const [pts,part,color] of [[s.ev.A,s.ev.pa,P.blue],[s.ev.B,s.ev.pb,P.purple]])pts.forEach((q,j)=>{
                    const alpha=part[j]?1-fluid:1-highlight*.82;
                    dot(ctx,cx+q[0]*scale,cy+q[1]*scale,Math.max(2,scale*.29),highlight>0&&part[j]?P.orange:color,alpha);
                });
                if(fluid>0){
                    const R=Math.max(17,o.R*scale),ecc=Math.min(o.eps2,.65),rx=R*Math.sqrt(1+ecc)*(1+expand*.18),ry=R*Math.sqrt(1-ecc)*(1+expand*.5);
                    drop(ctx,cx,cy,rx,ry,P.orange,fluid*(1-.5*emit),o.psi2);
                    if(expand>0)for(let j=0;j<8;j++){
                        const a=j*Math.PI/4+o.psi2,str=.7-.45*Math.cos(2*(a-o.psi2)),L=expand*22*str,r=R*.8;
                        u.arrow(ctx,cx+r*Math.cos(a),cy+r*Math.sin(a),cx+(r+L)*Math.cos(a),cy+(r+L)*Math.sin(a),P.orange,2,5);
                    }
                    if(emit>0)s.particles.forEach(q=>{
                        const strength=1-2*(p.flowScale??.25)*ecc*Math.cos(2*(q.a-o.psi2)),d=R*.8+emit*strength*q.v*Math.min(b.w,b.h)*.26;
                        const px=cx+d*Math.cos(q.a),py=cy+d*Math.sin(q.a);
                        line(ctx,[[px-8*emit*Math.cos(q.a),py-8*emit*Math.sin(q.a)],[px,py]],P.teal,1.2);dot(ctx,px,py,2.5,P.teal,fade);
                    });
                }
            });
            const sx=W-side-20;round(ctx,sx,75,side,H-139,12,'#edf4fa',null);
            text(ctx,'THIS TOY EVENT',sx+16,100,11,P.muted,'left',700);
            text(ctx,String(o.N),sx+16,141,31,P.orange,'left',700);text(ctx,'participating nucleons',sx+16,164,12,P.muted);
            text(ctx,'ε₂ = '+o.eps2.toFixed(2),sx+16,200,21,P.blue,'left',700);text(ctx,'overlap eccentricity',sx+16,221,12,P.muted);
            const phase=t<3?'Projected overlap':t<5.5?'Participants':t<9?'Fluid response':'Outgoing momenta';
            wrapped(ctx,phase,sx+16,259,side-28,16,P.ink,'left',22,700);
            if(H>450&&p.note)wrapped(ctx,p.note,sx+16,315,side-28,12,P.muted);
            footer(ctx,W,H,'Initial geometry → pressure gradients → correlated particle momenta');
        }
    });
})();
