import sys,numpy as np,soundfile as sf,mido
from scipy.signal import butter,sosfilt,fftconvolve
D=sys.argv[1];BPM=147;SR=44100;TPB=480;beat=60/BPM;BARS=16;rng=np.random.default_rng(33)
sn=[]
for b in range(BARS):
  t0=b*4;sn.append((t0+2,38,0.25,120))
  if b%8==7: sn+= [(t0+3.5,38,0.12,70),(t0+3.75,38,0.12,85)]   # petit fill avant la reprise
mf=mido.MidiFile(f'{D}/DRUMS_808_147BPM_Bm.mid');tr=mido.MidiTrack();tr.append(mido.MetaMessage('track_name',name='snare'));ms=[]
for t,n,d,v in sn: ms+=[(int(t*TPB),1,mido.Message('note_on',note=n,velocity=v,channel=9)),(int((t+d)*TPB),0,mido.Message('note_off',note=n,velocity=0,channel=9))]
ms.sort(key=lambda m:(m[0],m[1]));last=0
for tk,_,m in ms: m.time=tk-last;last=tk;tr.append(m)
mf.tracks.append(tr);mf.save(f'{D}/DRUMS_808_SNARE_147BPM_Bm.mid')
N=int(BARS*4*beat*SR);X=np.zeros(N)
for t,n,d,v in sn:
  L=int(0.35*SR);tt=np.arange(L)/SR
  body=np.sin(2*np.pi*np.cumsum(240+60*np.exp(-tt*60))/SR)*np.exp(-tt*28)*0.55
  wires=sosfilt(butter(2,[2500,11000],'band',fs=SR,output='sos'),rng.standard_normal(L))*np.exp(-tt*16)*0.7
  s=np.tanh(1.6*(body+wires))*v/127*0.5;a=int(t*beat*SR);X[a:a+L]+=s[:N-a]
ir=rng.standard_normal(int(0.8*SR))*np.exp(-np.arange(int(0.8*SR))/SR*7);ir=sosfilt(butter(2,[400,7000],'band',fs=SR,output='sos'),ir);ir/=np.sqrt((ir**2).sum())
SN=np.stack([X+fftconvolve(X,ir)[:N]*0.2,X+fftconvolve(X,np.roll(ir,131))[:N]*0.2],1)
H,_=sf.read(f'{D}/hats_seuls.wav');C,_=sf.read(f'{D}/clap_seul.wav');b8,_=sf.read(f'{D}/808_seul.wav');kk,_=sf.read(f'{D}/kick_seul.wav')
# hats/clap/808/kick were written with a common scale; bring snare to a similar level as the clap
SN*=np.abs(C).max()/np.abs(SN).max()*0.9
sh=H[:N]+SN;full=b8[:N]+kk[:N]+H[:N]+C[:N]*0.7+SN
for name,x in(('snare_seule',SN),('snare_hats',sh),('drums_808_snare_complet',full)): sf.write(f'{D}/{name}.wav',(x*0.85/np.abs(x).max()).astype('float32'),SR,subtype='PCM_24')
print('snares',len(sn))
