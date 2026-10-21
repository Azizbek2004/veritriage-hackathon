from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.dml import MSO_THEME_COLOR
from PIL import Image
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "pitch" / "The_FinTechers_VeriTriage_8slides.pptx"

INK = RGBColor(0x14,0x23,0x1C)
INK2 = RGBColor(0x33,0x46,0x3B)
PAPER = RGBColor(0xF6,0xF7,0xF3)
WHITE = RGBColor(0xFF,0xFF,0xFF)
GREEN = RGBColor(0x17,0x62,0x4B)
GREEN_DARK = RGBColor(0x0B,0x2A,0x20)
GREEN_PALE = RGBColor(0xE9,0xF3,0xED)
GREEN_LINE = RGBColor(0xCB,0xE1,0xD6)
GREY = RGBColor(0x5C,0x6F,0x65)
MUTED = RGBColor(0x83,0x94,0x8A)
LINE = RGBColor(0xDF,0xE6,0xE1)
RED = RGBColor(0xB4,0x2B,0x2B)
RED_PALE = RGBColor(0xFB,0xEC,0xEC)
AMBER = RGBColor(0xA8,0x5B,0x0E)
AMBER_PALE = RGBColor(0xFB,0xF3,0xE4)
FONT = "Aptos"
MONO = "Consolas"
W, H = 13.333, 7.5

prs = Presentation()
prs.slide_width = Inches(W)
prs.slide_height = Inches(H)

def blank():
    return prs.slides.add_slide(prs.slide_layouts[6])

def rect(sl,x,y,w,h,fill=WHITE,line=None,radius=True,shape=MSO_SHAPE.ROUNDED_RECTANGLE):
    sh=sl.shapes.add_shape(shape,Inches(x),Inches(y),Inches(w),Inches(h))
    sh.fill.solid(); sh.fill.fore_color.rgb=fill
    if line is None: sh.line.fill.background()
    else: sh.line.color.rgb=line; sh.line.width=Pt(0.8)
    if radius and shape==MSO_SHAPE.ROUNDED_RECTANGLE:
        try: sh.adjustments[0]=0.04
        except: pass
    return sh

def text(sl,x,y,w,h,s,size=16,color=INK,bold=False,font=FONT,align=PP_ALIGN.LEFT,
         anchor=MSO_ANCHOR.TOP,spacing=1.0,space_after=0,italic=False):
    box=sl.shapes.add_textbox(Inches(x),Inches(y),Inches(w),Inches(h))
    tf=box.text_frame; tf.word_wrap=True; tf.margin_left=0; tf.margin_right=0
    tf.margin_top=0; tf.margin_bottom=0; tf.vertical_anchor=anchor
    p=tf.paragraphs[0]; p.alignment=align; p.line_spacing=spacing; p.space_after=Pt(space_after)
    r=p.add_run(); r.text=s; r.font.name=font; r.font.size=Pt(size); r.font.bold=bold
    r.font.italic=italic; r.font.color.rgb=color
    return box

def rich(sl,x,y,w,h,parts,size=14,color=INK,font=FONT,align=PP_ALIGN.LEFT,spacing=1.05,space_after=4,anchor=MSO_ANCHOR.TOP):
    box=sl.shapes.add_textbox(Inches(x),Inches(y),Inches(w),Inches(h))
    tf=box.text_frame; tf.word_wrap=True; tf.margin_left=0; tf.margin_right=0; tf.margin_top=0; tf.margin_bottom=0
    tf.vertical_anchor=anchor
    first=True
    for part in parts:
        if isinstance(part,str): part={"t":part}
        p=tf.paragraphs[0] if first else tf.add_paragraph(); first=False
        p.alignment=align; p.line_spacing=spacing; p.space_after=Pt(part.get("after",space_after))
        r=p.add_run(); r.text=part.get("t",""); r.font.name=part.get("font",font)
        r.font.size=Pt(part.get("size",size)); r.font.bold=part.get("bold",False)
        r.font.italic=part.get("italic",False); r.font.color.rgb=part.get("color",color)
    return box

def kicker(sl,k,section):
    text(sl,0.65,0.40,7.0,0.25,k.upper(),9,GREEN,bold=True,font=MONO)
    text(sl,10.2,0.40,2.45,0.25,section.upper(),9,MUTED,bold=True,font=MONO,align=PP_ALIGN.RIGHT)

def title(sl,t,sub=None):
    text(sl,0.65,0.75,12.0,0.62,t,29,INK,bold=True)
    if sub: text(sl,0.65,1.35,11.8,0.38,sub,13,GREY)

def footer(sl,n,label="VERITRIAGE · THE FINTECHERS · TRACK 5 AML"):
    rect(sl,0.65,7.08,12.0,0.01,LINE)
    text(sl,0.65,7.14,8.0,0.2,label,7.5,MUTED,font=MONO)
    text(sl,11.8,7.14,0.85,0.2,f"{n:02d} / 08",7.5,MUTED,font=MONO,align=PP_ALIGN.RIGHT)

def light_bg(sl):
    bg=rect(sl,0,0,W,H,PAPER,None,False,MSO_SHAPE.RECTANGLE); bg.z_order=0

def dark_bg(sl):
    bg=rect(sl,0,0,W,H,GREEN_DARK,None,False,MSO_SHAPE.RECTANGLE); bg.z_order=0

def metric(sl,x,y,w,h,val,label,note="",accent=GREEN):
    rect(sl,x,y,w,h,WHITE,LINE)
    rect(sl,x,y,0.055,h,accent,None,False,MSO_SHAPE.RECTANGLE)
    text(sl,x+0.2,y+0.15,w-0.3,0.46,val,24,INK,bold=True,font=MONO)
    text(sl,x+0.2,y+0.62,w-0.3,0.25,label.upper(),8,GREY,bold=True,font=MONO)
    if note: text(sl,x+0.2,y+0.88,w-0.3,0.38,note,9,GREY)

def picture_cover(sl,path,x,y,w,h):
    path=Path(path)
    if not path.exists(): return
    iw,ih=Image.open(path).size; target=w/h; src=iw/ih
    pic=sl.shapes.add_picture(str(path),Inches(x),Inches(y),Inches(w),Inches(h))
    if src>target:
        crop=(1-target/src)/2; pic.crop_left=crop; pic.crop_right=crop
    else:
        crop=(1-src/target)/2; pic.crop_top=crop; pic.crop_bottom=crop
    pic.line.color.rgb=LINE; pic.line.width=Pt(0.8)
    return pic


# ---------------- 1. VISION ----------------
sl=blank(); dark_bg(sl); kicker(sl,"VERITRIAGE / FINREG TRACK 5","NORTH STAR")
text(sl,0.65,0.78,10,0.28,"VeriTriage",16,WHITE,bold=True,font=MONO)
text(sl,0.65,1.18,12,1.35,"The proof layer for\nregulated banking AI.",42,WHITE,bold=True,spacing=0.9)
text(sl,0.65,2.72,10.8,0.45,"The agent proposes. The verifier proves. The human signs.",21,RGBColor(0xCD,0xE8,0xDA),italic=True)
for i,(h,b) in enumerate([("AGENT","Bedrock gathers evidence and proposes a disposition."),("VERIFIER","C# recomputes every number and statutory gate."),("HUMAN","The MLRO signs the proof receipt.")]):
    x=0.65+i*4.05
    rect(sl,x,4.08,3.78,1.85,RGBColor(0x10,0x32,0x27),RGBColor(0x2A,0x54,0x43))
    text(sl,x+0.22,4.28,3.2,0.22,h,9,RGBColor(0x9F,0xD8,0xB9),bold=True,font=MONO)
    text(sl,x+0.22,4.62,3.3,1.0,b,12.5,WHITE,spacing=1.08)
text(sl,0.65,6.43,8.2,0.22,"397,853 ČNB rows · 72/72 tests · 4.9ms deep analysis · R 0.20 hero",9,RGBColor(0x9F,0xD8,0xB9),font=MONO)
text(sl,11.4,6.43,1.2,0.22,"01 / 08",9,RGBColor(0x9F,0xD8,0xB9),font=MONO,align=PP_ALIGN.RIGHT)
sl.notes_slide.notes_text_frame.text="20s: The agent proposes. The verifier proves. The human signs. VeriTriage is the proof layer that makes agentic AML triage deployable."

# ---------------- 2. PROBLEM ----------------
sl=blank(); light_bg(sl); kicker(sl,"01 / PROBLEM","WHY NOW")
title(sl,"The bottleneck is proof, not detection.","A mid-size PSP already has alerts. It does not have a defensible dossier in time.")
for i,(v,l) in enumerate([("5,000","alerts / day"),("23.5","FTE analysts"),("€1.16M","wasted / year")]):
    x=0.65+i*4.05
    rect(sl,x,1.95,3.78,1.55,WHITE,LINE)
    text(sl,x+0.22,2.14,3.0,0.55,v,29,INK,bold=True,font=MONO)
    text(sl,x+0.22,2.78,3.0,0.22,l.upper(),8,GREY,bold=True,font=MONO)
text(sl,0.65,3.90,4.2,0.3,"THE REAL CLOCK",9,GREEN,bold=True,font=MONO)
rich(sl,0.65,4.25,4.2,1.9,[
 {"t":"PSR Art. 83 / 55–56 and AML § 20 create bounded freeze and postponement windows.","size":11.5,"after":5},
 {"t":"Missing the window means eating the loss — or explaining it to the ČNB.","size":11.5,"after":5},
 {"t":"The work is re-building the same story from CSV, registries and PDFs.","size":11.5,"bold":True,"color":GREEN},
],11.5)
rect(sl,5.25,3.90,7.40,2.35,GREEN_DARK,None)
text(sl,5.53,4.13,6.8,0.22,"WHAT THE BANK NEEDS",9,RGBColor(0x9F,0xD8,0xB9),bold=True,font=MONO)
text(sl,5.53,4.48,6.7,0.95,"One reproducible answer:\nwhy this alert, which evidence, which statute, who signed.",17,WHITE,bold=True,spacing=1.05)
text(sl,5.53,5.65,6.7,0.24,"Not another black-box score.",9,RGBColor(0xCD,0xE8,0xDA),font=MONO)
footer(sl,2)
sl.notes_slide.notes_text_frame.text="20s: The bank has alerts. The bottleneck is the defensible dossier before the statutory clock. That is the product."

# ---------------- 3. ENGINE ----------------
sl=blank(); light_bg(sl); kicker(sl,"02 / ENGINE","HOW IT WORKS")
title(sl,"Four steps. One auditable decision.","Semantic reasoning is allowed to propose; it is not allowed to prove.")
steps=[("1","AGENT","Bedrock gathers entity, transaction and statutory evidence. It proposes a disposition."),
       ("2","C# VERIFIER","Recomputes every amount and checks 5 deterministic gates. Fail-closed."),
       ("3","OVERRIDE","If evidence or math disagrees, the verifier forces ESCALATE. The AI proposal is logged."),
       ("4","HUMAN SIGN","The MLRO signs a SHA-256 receipt with a real P-256 key. The proof is exportable.")]
for i,(n,h,b) in enumerate(steps):
    x=0.65+i*3.05
    rect(sl,x,1.92,2.82,2.38,WHITE,LINE)
    text(sl,x+0.18,2.10,0.3,0.22,n,8,GREEN,bold=True,font=MONO)
    text(sl,x+0.18,2.38,2.45,0.26,h,9,GREY,bold=True,font=MONO)
    text(sl,x+0.18,2.72,2.45,1.2,b,9.8,INK,spacing=1.06)
# bottom deterministic proof strip
rect(sl,0.65,4.62,12.0,1.28,GREEN_PALE,GREEN_LINE)
text(sl,0.92,4.82,3.2,0.22,"DETERMINISTIC CORE",9,GREEN,bold=True,font=MONO)
text(sl,0.92,5.12,3.1,0.42,"4.9 ms",24,GREEN,bold=True,font=MONO)
text(sl,0.92,5.57,3.1,0.2,"zero LLM tokens",8,GREY,font=MONO)
text(sl,4.25,5.12,3.1,0.42,"72 / 72",24,GREEN,bold=True,font=MONO)
text(sl,4.25,5.57,3.1,0.2,"tests green",8,GREY,font=MONO)
text(sl,7.55,5.12,3.1,0.42,"5 gates",24,GREEN,bold=True,font=MONO)
text(sl,7.55,5.57,3.1,0.2,"schema · scope · OCR · math · grounding",8,GREY,font=MONO)
text(sl,10.55,5.12,2.0,0.42,"0",24,GREEN,bold=True,font=MONO)
text(sl,10.55,5.57,2.0,0.2,"fabricated legal text",8,GREY,font=MONO)
footer(sl,3)
sl.notes_slide.notes_text_frame.text="20s: Four steps: agent, verifier, override, human. The verifier is pure C#, zero LLM tokens, five gates, fail-closed."

# ---------------- 4. GRAPH ----------------
sl=blank(); light_bg(sl); kicker(sl,"03 / TOPOLOGY","WHO IS WHO")
title(sl,"The graph separates mules from victims.","45 alerts into four roles. The bank can freeze the mule without treating a phished client as the criminal.")
picture_cover(sl,ROOT/"screenshots"/"radar_only.png",0.65,1.75,7.6,4.35)
# right insights
rect(sl,8.55,1.75,4.12,1.10,WHITE,LINE)
text(sl,8.78,1.92,3.7,0.2,"MULE HUBS",8,RED,bold=True,font=MONO)
text(sl,8.78,2.18,3.7,0.22,"8",22,INK,bold=True,font=MONO)
text(sl,8.78,2.52,3.7,0.2,"highest shared hub + topology",8,GREY)
rect(sl,8.55,3.00,4.12,1.10,WHITE,LINE)
text(sl,8.78,3.17,3.7,0.2,"RINGS",8,AMBER,bold=True,font=MONO)
text(sl,8.78,3.43,3.7,0.22,"8",22,INK,bold=True,font=MONO)
text(sl,8.78,3.77,3.7,0.2,"cyclic / multi-hop structuring",8,GREY)
rect(sl,8.55,4.25,4.12,1.10,WHITE,LINE)
text(sl,8.78,4.42,3.7,0.2,"TAKEN CLIENTS",8,RGBColor(0xB0,0x6A,0x0A),bold=True,font=MONO)
text(sl,8.78,4.68,3.7,0.22,"15",22,INK,bold=True,font=MONO)
text(sl,8.78,5.02,3.7,0.2,"low/medium tier draining to hubs",8,GREY)
text(sl,8.55,5.55,4.1,0.24,"HERO: ALERT-045 · R = 0.20",9,GREEN,bold=True,font=MONO)
text(sl,8.55,5.83,4.1,0.24,"14 isolated periphery",9,GREY,font=MONO)
footer(sl,4)
sl.notes_slide.notes_text_frame.text="20s: The graph is not decoration. It differentiates the complicit mule hub from the compromised victim. Eight mule hubs, eight rings, fifteen taken clients."

# ---------------- 5. MONEY FLOW ----------------
sl=blank(); light_bg(sl); kicker(sl,"04 / MONEY FLOW","FOLLOW THE MONEY")
title(sl,"Follow the money from the account.","A reconstructed money trail, not a single transaction score.")
picture_cover(sl,ROOT/"screenshots"/"money_flow_panel.png",0.65,1.72,4.2,4.55)
for i,(k,v,n) in enumerate([("OUTFLOW","301,846 CZK","dispersed"),("TRANSFERS","16","reconstructed"),("STRUCTURING","5 tx","sub-threshold")]):
    x=5.15; y=1.72+i*1.20
    rect(sl,x,y,7.2,1.02,WHITE,LINE)
    text(sl,x+0.2,y+0.12,6.7,0.2,k,8,GREEN,bold=True,font=MONO)
    text(sl,x+0.2,y+0.38,6.7,0.30,v,16,INK,bold=True,font=MONO)
    text(sl,x+0.2,y+0.70,6.7,0.2,n,8,GREY)
text(sl,5.15,5.40,7.2,0.50,"§ 6(1)(b): multi-account structuring.\nThe trail is the evidence.",10,GREEN,bold=True,spacing=1.05)
footer(sl,5)
sl.notes_slide.notes_text_frame.text="20s: This is the money-flow DAG. It reconstructs 16 accounts and 16 transfers, with 301,846 CZK outflow and five sub-threshold transfers. The point is the path, not a single score."

# ---------------- 6. DEEP ANALYSIS ----------------
sl=blank(); light_bg(sl); kicker(sl,"05 / DEEP ANALYSIS","4.9 MS")
title(sl,"Deep analysis: arithmetic first, tokens never.","The deterministic engine scans the client history, builds the 5-vector profile and writes a legal brief.")
# metrics
for i,(v,l) in enumerate([("397,853","rows scanned"),("4.9 ms","deep analysis"),("1.71x","velocity / count"),("13 / 95.5k","72h CZK cluster")]):
    x=0.65+i*3.05
    rect(sl,x,1.92,2.82,1.15,WHITE,LINE)
    text(sl,x+0.18,2.08,2.5,0.32,v,17,INK,bold=True,font=MONO)
    text(sl,x+0.18,2.47,2.5,0.2,l.upper(),7.5,GREY,bold=True,font=MONO)
# priority band
rect(sl,0.65,3.40,12.0,1.12,GREEN_DARK,None)
text(sl,0.92,3.58,2.8,0.22,"HERO PRIORITY",8,RGBColor(0x9F,0xD8,0xB9),bold=True,font=MONO)
text(sl,0.92,3.86,3.2,0.42,"96 / 100",26,WHITE,bold=True,font=MONO)
text(sl,0.92,4.25,3.2,0.18,"B40 + V11 + P25 + S20",8,RGBColor(0xCD,0xE8,0xDA),font=MONO)
text(sl,4.55,3.86,7.7,0.52,"1.71x volume · 13 transfers in 72h · HHI 916 · ACZ00005 · 3 linked clients",10,WHITE)
text(sl,4.55,4.24,7.7,0.18,"Every number recomputed in System.Decimal. No LLM in this path.",8,RGBColor(0xCD,0xE8,0xDA),font=MONO)
# three bullets
for i,(h,b) in enumerate([("DETERMINISTIC BRIEF","Markdown + exportable legal dossier. Reproducible, no prompt variance."),("TRACEABLE","Every claim tied to the transaction cluster and statutory clause."),("HUMAN-READY","The MLRO sees the proof, not a black-box score.")]):
    x=0.65+i*4.05
    text(sl,x,4.92,3.7,0.22,h,8.5,GREEN,bold=True,font=MONO)
    text(sl,x,5.20,3.65,0.65,b,9.5,GREY,spacing=1.05)
footer(sl,6)
sl.notes_slide.notes_text_frame.text="20s: Deep analysis is 4.9 milliseconds, zero tokens: 397,853 rows, 1.71x velocity, 13 sub-threshold transfers, priority 96. The brief is generated from the arithmetic."

# ---------------- 7. FAU / HUMAN SIGN ----------------
sl=blank(); light_bg(sl); kicker(sl,"06 / LEGAL ARTIFACT","FAÚ OPO")
title(sl,"From alert to a signed FAÚ § 18 dossier.","The output is not a screen. It is a legal artifact a human can sign and a regulator can inspect.")
picture_cover(sl,ROOT/"screenshots"/"dossiers_panel.png",0.65,1.75,6.35,4.35)
# right 4 cards
checks=[("4-EYES","Same-person approval returns HTTP 400. Independent MLRO required."),
        ("SHARED HUB","PEP + structuring + network role bound to the evidence."),
        ("LEGAL MEMO","§ 6(1)(a), § 6(1)(b), § 9a(2)(c), § 18. Six-section memo."),
        ("NON-REPUDIATION","SHA-256 audit chain + real P-256 dossier signature.")]
for i,(h,b) in enumerate(checks):
    y=1.75+i*1.08
    rect(sl,7.35,y,5.35,0.92,WHITE,LINE)
    text(sl,7.55,y+0.13,4.9,0.2,h,8.5,GREEN,bold=True,font=MONO)
    text(sl,7.55,y+0.37,4.9,0.42,b,9,GREY,spacing=1.03)
text(sl,0.65,6.25,6.2,0.22,"The MLRO signs the decision — not the model.",9,GREEN,bold=True,font=MONO)
footer(sl,7)
sl.notes_slide.notes_text_frame.text="20s: The output is a dossier: 4-eyes enforced server-side, legal citations, audit chain, real P-256 signature. The model never signs; the MLRO does."

# ---------------- 8. ASK ----------------
sl=blank(); dark_bg(sl); kicker(sl,"07 / NEXT","THE ASK")
text(sl,0.65,1.02,12,1.2,"A proof layer the bank\ncan actually deploy.",34,WHITE,bold=True,spacing=0.94)
text(sl,0.65,2.55,10.8,0.35,"What is live now",10,RGBColor(0x9F,0xD8,0xB9),bold=True,font=MONO)
facts=[("397,853","ČNB rows in the full ledger"),("4.9 ms","deterministic deep analysis"),("72 / 72","tests green"),("8 / 8 / 15 / 14","mule / ring / taken / isolated"),("45","FINREG rows, exact 11-column CSV"),("P-256","real dossier signature + audit chain")]
for i,(v,l) in enumerate(facts):
    x=0.65+(i%3)*4.05; y=2.93+(i//3)*1.05
    text(sl,x,y,1.4,0.3,v,19,WHITE,bold=True,font=MONO)
    text(sl,x,y+0.35,3.5,0.2,l,8.5,RGBColor(0xCD,0xE8,0xDA),font=MONO)
rect(sl,0.65,5.42,12.0,1.15,RGBColor(0x10,0x32,0x27),RGBColor(0x2A,0x54,0x43))
text(sl,0.92,5.62,1.6,0.2,"THE ASK",8,RGBColor(0x9F,0xD8,0xB9),bold=True,font=MONO)
text(sl,0.92,5.88,8.1,0.45,"Two pilot PSPs + FINREG feedback to move into a pre-production sandbox.",12,WHITE,bold=True)
text(sl,9.6,5.64,2.8,0.22,"THE FINTECHERS",8.5,RGBColor(0x9F,0xD8,0xB9),font=MONO,align=PP_ALIGN.RIGHT)
text(sl,9.6,5.90,2.8,0.22,"Track 5 · AML",9.5,WHITE,font=MONO,align=PP_ALIGN.RIGHT)
text(sl,9.6,6.16,2.8,0.22,"Demo: localhost:3100",8,RGBColor(0xCD,0xE8,0xDA),font=MONO,align=PP_ALIGN.RIGHT)
text(sl,0.65,6.78,9,0.2,"Synthetic ČNB data · Bedrock snapshot fallback is labeled · no live-AWS claim.",7.5,RGBColor(0x9F,0xD8,0xB9),font=MONO)
text(sl,11.4,6.78,1.2,0.2,"08 / 08",7.5,RGBColor(0x9F,0xD8,0xB9),font=MONO,align=PP_ALIGN.RIGHT)
sl.notes_slide.notes_text_frame.text="20s: Live now: 397,853-row ledger, 4.9ms deep analysis, 72/72 tests, balanced topology, exact CSV, real P-256 signatures. Ask: two pilot PSPs and FINREG feedback."

prs.save(OUT)
print("saved", OUT, "slides", len(prs.slides))
