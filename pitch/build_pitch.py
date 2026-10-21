from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.dml import MSO_THEME_COLOR
from PIL import Image
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "pitch" / "The_FinTechers_VeriTriage_FINREG.pptx"

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
    text(sl,11.8,7.14,0.85,0.2,f"{n:02d} / 11",7.5,MUTED,font=MONO,align=PP_ALIGN.RIGHT)

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

# ---------------- SLIDE 1 ----------------
sl=blank(); dark_bg(sl)
kicker(sl,"SLIDE 01 / 11 • FOUNDATION","NORTH STAR")
text(sl,0.65,0.78,12.0,0.30,"VeriTriage",15,WHITE,bold=True,font=MONO)
text(sl,0.65,1.18,12.0,1.40,"The proof layer for\nregulated banking AI.",40,WHITE,bold=True,spacing=0.92)
text(sl,0.65,2.70,9.7,0.50,"The agent proposes. The verifier proves. The human signs.",20,RGBColor(0xCD,0xE8,0xDA),italic=True)
# three cards
cards=[("THE WHY","Banks want agentic triage. Regulators will never accept a black-box LLM moving money or approving a dossier."),
       ("THE FOCUS","A deterministic C# proof layer between AI reasoning and human compliance sign-off. Not a ledger. Not a wrapper."),
       ("THE OUTCOME","Every claim recomputed, every statutory gate checked, every decision signed and hash-chained.")]
for i,(h,b) in enumerate(cards):
    x=0.65+i*4.05
    rect(sl,x,4.05,3.78,2.15,RGBColor(0x10,0x32,0x27),RGBColor(0x2A,0x54,0x43))
    text(sl,x+0.22,4.27,3.3,0.22,h,9,RGBColor(0x9F,0xD8,0xB9),bold=True,font=MONO)
    text(sl,x+0.22,4.62,3.33,1.28,b,12,WHITE,spacing=1.08)
text(sl,0.65,6.52,8.0,0.28,"FINREG Partners Challenge · Track 5 AML · The FinTechers",9,RGBColor(0x9F,0xD8,0xB9),font=MONO)
text(sl,11.5,6.52,1.2,0.28,"01 / 11",9,RGBColor(0x9F,0xD8,0xB9),font=MONO,align=PP_ALIGN.RIGHT)
# notes
sl.notes_slide.notes_text_frame.text="15s: Under PSR Article 83 and the Czech AML Act, a PSP handles thousands of alerts a day. VeriTriage is the proof layer: the agent investigates, the deterministic C# verifier proves, and the compliance officer signs."

# ---------------- SLIDE 2 ----------------
sl=blank(); light_bg(sl); kicker(sl,"SLIDE 02 / 11 • VALIDATION","PAIN POINT")
title(sl,"Problem: the €1.16M compliance paralysis","European PSPs face impossible triage volume under PSR Art. 83 and Czech AML Act § 20.")
for i,(v,l,n) in enumerate([("5,000","alerts / day","typical mid-size European PSP"),("23.5","FTE analysts","manual dossier assembly at 30 min/alert"),("€1.16M","wasted / year","repetitive compliance operations")]):
    metric(sl,0.65+i*4.05,2.02,3.75,1.55,v,l,n,GREEN if i==2 else INK)
# urgency panel
rect(sl,0.65,3.95,7.7,2.55,AMBER_PALE,RGBColor(0xE8,0xC9,0x9D))
text(sl,0.90,4.18,7.1,0.28,"WHY NOW",9,AMBER,bold=True,font=MONO)
text(sl,0.90,4.52,7.0,0.46,"The clock is the product.",19,INK,bold=True)
rich(sl,0.90,5.08,6.9,1.2,[
 {"t":"PSR Art. 55/56 and AML § 20 create bounded freeze / postponement windows.","size":11.5,"after":4},
 {"t":"Missing the window means eating the loss, or explaining it to the ČNB.","size":11.5,"after":4},
 {"t":"The bottleneck is not detection. It is defensible, timely dossier assembly.","size":11.5,"bold":True,"color":GREEN},
],11.5,INK)
# right dark stat
rect(sl,8.65,3.95,4.03,2.55,INK,None)
text(sl,8.92,4.18,3.45,0.25,"THE OPERATIONAL REALITY",9,RGBColor(0x9F,0xD8,0xB9),bold=True,font=MONO)
text(sl,8.92,4.62,3.45,1.25,"Analysts rebuild the same story\nfrom CSV, registries and PDFs\nfor every alert.",14,WHITE,spacing=1.1)
text(sl,8.92,6.02,3.45,0.26,"High false positives. Low auditability.",8.5,RGBColor(0xCD,0xE8,0xDA),font=MONO)
footer(sl,2)
sl.notes_slide.notes_text_frame.text="20s: A mid-size bank faces 5,000 alerts daily. Manual work consumes 23.5 FTEs and €1.16M a year. The real risk is the statutory clock: the dossier must be defensible before the window closes."

# ---------------- SLIDE 3 ----------------
sl=blank(); light_bg(sl); kicker(sl,"SLIDE 03 / 11 • PRODUCT","DEFENSIBLE MOAT")
title(sl,"Solution: neuro-symbolic triage, deterministic proof","Separate semantic reasoning from mathematical verification.")
items=[("01","UNFAIR ADVANTAGE","Bedrock proposes. C# proves.","The agent gathers entity and pattern evidence. A zero-LLM C# engine recomputes every number, IBAN/IČO and statutory gate.",GREEN),
       ("02","DEFENSIBILITY","Fail-closed by construction.","If OCR confidence drops, an amount diverges, or a claim is ungrounded, the verifier overrides the AI and escalates.",RED),
       ("03","CLARITY","Sidecar, not replacement.","Consumes alerts from Actimize/NICE/Fiserv and emits the 11-column CSV, audit chain and FAÚ dossier. Zero ledger changes.",AMBER)]
for i,(n,k,h,b,c) in enumerate(items):
    x=0.65+i*4.05
    rect(sl,x,2.0,3.78,4.15,WHITE,LINE)
    text(sl,x+0.24,2.22,0.45,0.35,n,11,c,bold=True,font=MONO)
    text(sl,x+0.24,2.62,3.2,0.25,k,9,GREY,bold=True,font=MONO)
    text(sl,x+0.24,2.96,3.2,0.75,h,17,INK,bold=True,spacing=0.96)
    text(sl,x+0.24,3.78,3.2,1.55,b,11.2,INK2,spacing=1.08)
    rect(sl,x+0.24,5.60,3.3,0.02,c)
    text(sl,x+0.24,5.74,3.2,0.22,["MODEL + PROOF","FAIL-CLOSED","NO LEDGER CHANGE"][i],8,c,bold=True,font=MONO)
footer(sl,3)
sl.notes_slide.notes_text_frame.text="20s: Our solution is neuro-symbolic. Bedrock gathers evidence; a deterministic C# verifier recomputes all arithmetic and statutory invariants. If the model hallucinates, the verifier overrides it fail-closed. A human signs."

# ---------------- SLIDE 4 ----------------
sl=blank(); light_bg(sl); kicker(sl,"SLIDE 04 / 11 • PEOPLE","WHY US")
title(sl,"The FinTechers: engineered for regulated fintech","Three capabilities in one build team — not three separate vendors.")
caps=[("ENGINEERING","Low-latency .NET 9","Deterministic priority, topology and verifier code. 72 automated tests. One deployable API + Next.js cockpit."),
      ("APPLIED AI","Bedrock + guardrails","Agentic investigation constrained by injected statutory evidence and a C# override. Snapshot fallback is visible, never relabeled."),
      ("COMPLIANCE","AML + PSR fluency","Czech AML Act § 6/§ 9a/§ 18/§ 21, ČNB Decree 67/2018, PSR Art. 83 and 4-eyes separation of duties.")]
for i,(k,h,b) in enumerate(caps):
    x=0.65+i*4.05
    rect(sl,x,2.05,3.78,3.95,WHITE,LINE)
    text(sl,x+0.24,2.27,3.3,0.22,k,9,GREEN,bold=True,font=MONO)
    text(sl,x+0.24,2.62,3.2,0.72,h,17,INK,bold=True)
    text(sl,x+0.24,3.52,3.2,1.7,b,11,INK2,spacing=1.08)
# bottom note
rect(sl,0.65,6.20,12.0,0.58,GREEN_PALE,GREEN_LINE)
text(sl,0.90,6.36,11.5,0.24,"Built during the FINREG hackathon: verifier, cockpit, radar, dossiers, CSV and audit chain in one repo.",10,GREEN,bold=True,font=MONO)
footer(sl,4)
sl.notes_slide.notes_text_frame.text="10s: We combined .NET low-latency engineering, applied Bedrock AI and AML/PSR compliance. The point is that the proof layer and the agent were designed together, not glued on."

# ---------------- SLIDE 5 ----------------
sl=blank(); light_bg(sl); kicker(sl,"SLIDE 05 / 11 • EXECUTION","LIVE BUILD")
title(sl,"Demo: the proof layer working live","What the judges see on screen — no pre-baked numbers.")
# left narrative
items=[("01","FULL LEDGER","397,853 ČNB rows · 5,493 clients","100-row server pagination. Search is over the whole dataset, not a 45-row sample."),
       ("02","TOPOLOGICAL RADAR","8 mule hubs · 8 rings","15 compromised clients · 14 isolated. Light-mode SVG, click-through to the case."),
       ("03","DETERMINISTIC OVERRIDE","Priority 96 = B40 + V11 + P25 + S20","Same-person approval fails closed with HTTP 400. The AI cannot bypass it.")]
for i,(n,k,h,b) in enumerate(items):
    y=1.78+i*1.03
    text(sl,0.65,y,0.35,0.24,n,8,GREEN,bold=True,font=MONO)
    text(sl,0.98,y-0.01,3.95,0.22,k,8.5,GREEN,bold=True,font=MONO)
    text(sl,0.98,y+0.24,4.15,0.28,h,11.5,INK,bold=True)
    text(sl,0.98,y+0.54,4.18,0.40,b,9,GREY,spacing=1.04)
# red proof chip
rect(sl,0.65,5.10,4.35,0.48,RED_PALE,RGBColor(0xE8,0xC5,0xC5))
text(sl,0.85,5.24,4.0,0.20,"PROOF: SHA-256 CHAIN + REAL P-256 SIGNATURE",8,RED,bold=True,font=MONO)
# screenshot, fully seated above metrics
picture_cover(sl,ROOT/"screenshots"/"pitch_minimal.png",5.42,1.62,7.28,4.28)
# three metrics only
metric(sl,0.65,6.02,3.0,0.64,"4.9 ms","deep analysis","",GREEN)
metric(sl,3.85,6.02,3.0,0.64,"72 / 72","tests green","",GREEN)
metric(sl,7.05,6.02,3.0,0.64,"397,853","rows scanned","",GREEN)
metric(sl,10.25,6.02,2.43,0.64,"13 / 95.5k","72h structuring","",AMBER)
footer(sl,5)
sl.notes_slide.notes_text_frame.text="25s: This is the actual build: 397,853 rows, a light topology radar, deterministic priority 96, a hard 4-eyes block, and real P-256 dossier signatures. Point at the override line: the AI cannot bypass it."

# ---------------- SLIDE 6 ----------------
sl=blank(); light_bg(sl); kicker(sl,"SLIDE 06 / 11 • STACK","VELOCITY")
title(sl,"Stack: enterprise-grade, audit-friendly","Chosen for determinism, speed and a clean deployment boundary.")
stack=[("C# .NET 9","Deterministic rules, priority, topology, 5-gate verifier. 72 tests."),
       ("Amazon Bedrock","Claude Sonnet investigation in eu-central-1; statutory corpus injected. Snapshot fallback visible."),
       ("Next.js 15 · React 19","Minimal banking cockpit, SVG radar, D3 money-flow DAG."),
       ("ECDSA P-256 · SHA-256","Real dossier signatures, hash-chained file ledger, printable legal memo.")]
for i,(h,b) in enumerate(stack):
    x=0.65+(i%2)*6.15; y=1.85+(i//2)*2.28
    rect(sl,x,y,5.8,1.95,WHITE,LINE)
    text(sl,x+0.25,y+0.22,5.2,0.30,h,15,INK,bold=True,font=MONO)
    text(sl,x+0.25,y+0.67,5.2,1.0,b,11,INK2,spacing=1.08)
# side note
rect(sl,0.65,6.22,12.0,0.52,GREEN_PALE,GREEN_LINE)
text(sl,0.88,6.37,11.6,0.24,"No new runtime package for this pass · D3 + Lucide already in the repo · no vector DB · no external graph server",9,GREEN,bold=True,font=MONO)
footer(sl,6)
sl.notes_slide.notes_text_frame.text="15s: Enterprise stack: deterministic .NET, Bedrock for semantic work, Next.js for the cockpit, ECDSA and SHA-256 for non-repudiation. The graph is D3/SVG; no heavy external graph server."

# ---------------- SLIDE 7 ----------------
sl=blank(); light_bg(sl); kicker(sl,"SLIDE 07 / 11 • MONETIZATION","UNIT ECONOMICS")
title(sl,"Business model: recurring B2B SaaS","The buyer is the compliance function; the value is defensible throughput.")
rev=[("PLATFORM","€3k–15k / month","Base tier by transaction volume and deployment scope."),
     ("USAGE","€0.05 / alert","Tiered per 10,000 alerts. Manual review is €2.50+ per alert."),
     ("SEATS","Compliance + MLRO","Licensed analyst seats and authorized signatory credentials.")]
for i,(k,h,b) in enumerate(rev):
    x=0.65+i*4.05
    rect(sl,x,1.98,3.78,2.35,WHITE,LINE)
    text(sl,x+0.24,2.18,3.2,0.22,k,8,GREEN,bold=True,font=MONO)
    text(sl,x+0.24,2.50,3.2,0.52,h,19,INK,bold=True)
    text(sl,x+0.24,3.18,3.2,0.9,b,10.5,GREY)
# ROI strip
rect(sl,0.65,4.72,12.0,1.55,GREEN_DARK,None)
text(sl,0.95,4.96,3.1,0.28,"CUSTOMER ROI",9,RGBColor(0x9F,0xD8,0xB9),bold=True,font=MONO)
text(sl,0.95,5.28,3.0,0.55,"11x+",35,WHITE,bold=True,font=MONO)
text(sl,0.95,5.86,3.0,0.22,"YEAR-1 NET ROI",8,RGBColor(0xCD,0xE8,0xDA),font=MONO)
text(sl,4.45,5.10,3.1,0.45,"€1.16M",24,WHITE,bold=True,font=MONO)
text(sl,4.45,5.55,3.1,0.25,"saved / year",8.5,RGBColor(0xCD,0xE8,0xDA),font=MONO)
text(sl,7.1,5.10,3.1,0.45,"~€80k",24,WHITE,bold=True,font=MONO)
text(sl,7.1,5.55,3.1,0.25,"software cost / year",8.5,RGBColor(0xCD,0xE8,0xDA),font=MONO)
text(sl,9.8,5.13,2.6,0.9,"North star:\nalerts resolved\nwithout manual dossiers.",11,WHITE,spacing=1.05)
footer(sl,7)
sl.notes_slide.notes_text_frame.text="15s: B2B SaaS: platform, usage and seats. At five cents per alert, the bank saves over 95% versus manual review and gets an 11x year-one ROI."

# ---------------- SLIDE 8 ----------------
sl=blank(); light_bg(sl); kicker(sl,"SLIDE 08 / 11 • DISTRIBUTION","ACQUISITION")
title(sl,"Go-to-market: frictionless sidecar distribution","No core-ledger replacement. A 14-day proof on historical batches.")
ch=[("DIRECT","PSPs, EMIs, neo-banks","Outbound to heads of compliance and MLROs facing PSR Article 83 audits. Land with a 45-alert benchmark."),
    ("PARTNER","FINREG + consultancies","Regulatory advisors recommend VeriTriage when an audit finding requires deterministic evidence and 4-eyes proof."),
    ("INTEGRATE","Actimize · NICE · Fiserv","Webhook or batch export in; proof receipt and dossier out. No changes to the core ledger.")]
for i,(k,h,b) in enumerate(ch):
    x=0.65+i*4.05
    rect(sl,x,1.98,3.78,3.65,WHITE,LINE)
    text(sl,x+0.24,2.18,3.2,0.22,k,9,GREEN,bold=True,font=MONO)
    text(sl,x+0.24,2.54,3.2,0.55,h,16,INK,bold=True)
    text(sl,x+0.24,3.25,3.2,1.6,b,10.8,INK2,spacing=1.08)
# timeline
rect(sl,0.65,5.92,12.0,0.72,GREEN_PALE,GREEN_LINE)
text(sl,0.92,6.10,2.0,0.22,"14-DAY POC",9,GREEN,bold=True,font=MONO)
text(sl,2.2,6.10,10.1,0.24,"Historical batch → 80%+ auto-clear proof → zero-ledger security review → pilot sandbox.",10.5,GREEN)
footer(sl,8)
sl.notes_slide.notes_text_frame.text="15s: Because we are a read-only sidecar, the buyer does not need a multi-year core replacement. We land in 14 days with historical data, prove auto-clear and auditability, then connect to the case-management system."

# ---------------- SLIDE 9 ----------------
sl=blank(); light_bg(sl); kicker(sl,"SLIDE 09 / 11 • LANDSCAPE","DIFFERENTIATION")
title(sl,"Competition: the proof gap is the opening","Legacy rules are brittle; black-box agents are unprovable. We combine both halves.")
# table header
rect(sl,0.65,1.95,3.25,0.55,INK,None); text(sl,0.85,2.10,2.9,0.22,"LEGACY (ACTIMIZE, SAS)",8,WHITE,bold=True,font=MONO)
rect(sl,4.15,1.95,3.25,0.55,INK,None); text(sl,4.35,2.10,2.9,0.22,"BLACK-BOX AI WRAPPER",8,WHITE,bold=True,font=MONO)
rect(sl,7.65,1.95,3.25,0.55,GREEN,None); text(sl,7.85,2.10,2.9,0.22,"VERITRIAGE",8,WHITE,bold=True,font=MONO)
rows=[("Enterprise distribution","Fast demo setup","Deterministic proof + agentic evidence"),
      ("95%+ false-positive noise","Hallucinated numbers","C# recomputation + 5 gates"),
      ("Manual PDF dossiers","No legal grounding","Quoted statutory corpus + audit chain"),
      ("No agentic investigation","Rejected by regulators","Human-signed, tamper-evident receipt")]
for i,(a,b,c) in enumerate(rows):
    y=2.62+i*0.82
    rect(sl,0.65,y,3.25,0.74,WHITE,LINE); text(sl,0.82,y+0.12,2.95,0.5,a,9.5,INK2)
    rect(sl,4.15,y,3.25,0.74,WHITE,LINE); text(sl,4.32,y+0.12,2.95,0.5,b,9.5,INK2)
    rect(sl,7.65,y,3.25,0.74,GREEN_PALE,GREEN_LINE); text(sl,7.82,y+0.12,2.95,0.5,c,9.5,GREEN,bold=True)
# advantage
rect(sl,0.65,6.15,12.0,0.62,GREEN_DARK,None)
text(sl,0.92,6.31,11.5,0.24,"“Semantic reasoning of agentic AI, with the proof of a deterministic compiler.”",11,WHITE,italic=True)
footer(sl,9)
sl.notes_slide.notes_text_frame.text="15s: Incumbents leave analysts in false positives. GenAI wrappers cannot prove a number. VeriTriage delivers the reasoning of an agent with the proof of a compiler."

# ---------------- SLIDE 10 ----------------
sl=blank(); light_bg(sl); kicker(sl,"SLIDE 10 / 11 • SIZING","BOTTOM-UP")
title(sl,"Market: the compliance automation surge","EU AMLA, AMLD6 and PSR Article 83 expand the audited population.")
for i,(k,v,d,c) in enumerate([("TAM","$14.2B","Global financial-crime and AML compliance software by 2028.",INK),
                              ("SAM","$3.4B","European banks, EMIs and PSPs under AMLA / AMLD6 / PSR.",GREEN),
                              ("SOM","$420M","Mid-tier European payment institutions and digital banks.",AMBER)]):
    x=0.65+i*4.05
    rect(sl,x,2.0,3.78,3.45,WHITE,LINE)
    text(sl,x+0.24,2.22,3.3,0.22,k,9,c,bold=True,font=MONO)
    text(sl,x+0.24,2.65,3.3,0.75,v,32,INK,bold=True,font=MONO)
    text(sl,x+0.24,3.62,3.2,1.15,d,11,INK2,spacing=1.08)
text(sl,0.65,5.82,12.0,0.40,"The wedge: mid-tier institutions that cannot afford 20+ manual analysts but face the same statutory clocks.",12,GREEN,bold=True)
footer(sl,10)
sl.notes_slide.notes_text_frame.text="10s: The EU AML package and PSR Article 83 expand the audited population. Our initial focus is the mid-tier European PSP market: large enough to pay, small enough to lack 20 analysts."

# ---------------- SLIDE 11 ----------------
sl=blank(); dark_bg(sl); kicker(sl,"SLIDE 11 / 11 • CONCLUSION","THE ASK")
text(sl,0.65,1.05,12.0,1.25,"Triage at AI speed.\nProof at machine precision.",34,WHITE,bold=True,spacing=0.94)
text(sl,0.65,2.55,10.2,0.35,"What is already built",11,RGBColor(0x9F,0xD8,0xB9),bold=True,font=MONO)
checks=[("72/72 tests green","deterministic verifier + topology + priority"),
        ("45-row FINREG CSV","exact 11-column contract; 4-eyes returns 400"),
        ("Live cockpit","397,853-row ledger · light radar · legal dossiers"),
        ("Real P-256 signatures","SPKI public key in the dossier export")]
for i,(h,b) in enumerate(checks):
    y=3.0+(i%2)*0.62; x=0.65+(i//2)*6.1
    text(sl,x,y,0.25,0.22,"✓",12,RGBColor(0x7F,0xD1,0xAB),bold=True)
    text(sl,x+0.28,y-0.02,5.5,0.24,h,10.5,WHITE,bold=True)
    text(sl,x+0.28,y+0.23,5.4,0.20,b,8.5,RGBColor(0xCD,0xE8,0xDA))
# ask
rect(sl,0.65,4.72,12.0,1.55,RGBColor(0x10,0x32,0x27),RGBColor(0x2A,0x54,0x43))
text(sl,0.92,4.94,2.4,0.22,"THE ASK",9,RGBColor(0x9F,0xD8,0xB9),bold=True,font=MONO)
text(sl,0.92,5.26,7.7,0.75,"2 pilot PSPs and regulatory feedback from FINREG Partners to move the proof layer into a pre-production sandbox.",14,WHITE,bold=True,spacing=1.05)
text(sl,9.2,5.22,2.9,0.24,"THE FINTECHERS",9,RGBColor(0x9F,0xD8,0xB9),font=MONO,align=PP_ALIGN.RIGHT)
text(sl,9.2,5.50,2.9,0.24,"Track 5 · AML",10,WHITE,font=MONO,align=PP_ALIGN.RIGHT)
text(sl,9.2,5.82,2.9,0.24,"Demo: localhost:3100",9,RGBColor(0xCD,0xE8,0xDA),font=MONO,align=PP_ALIGN.RIGHT)
text(sl,0.65,6.70,9.0,0.24,"Synthetic ČNB data · Bedrock snapshot fallback is labeled · nothing relabeled.",8,RGBColor(0x9F,0xD8,0xB9),font=MONO)
text(sl,11.4,6.70,1.2,0.24,"11 / 11",8,RGBColor(0x9F,0xD8,0xB9),font=MONO,align=PP_ALIGN.RIGHT)
sl.notes_slide.notes_text_frame.text="15s: In 30 hours we built a tested proof layer with a live cockpit, 397k-row ledger, topology radar, legal dossiers and real P-256 signatures. We are looking for pilot partners and regulatory feedback. Thank you."

prs.save(OUT)
print("saved",OUT,"slides",len(prs.slides))
