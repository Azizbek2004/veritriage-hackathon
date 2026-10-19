# VeriTriage Loyihasidagi Umumiy O‘zgarishlar va Tuzatishlar Hisoboti

**Hujjat sanasi:** 2026-10-20  
**Loyiha:** VeriTriage — Bank AML & Fraud Triage Engine  
**Mas'ul:** Backend & Verifier Hardening jamoasi  
**Holat:** ✅ Barcha 59 ta test yashil (Passed: 59, Failed: 0), o‘zgarishlar GitHub `main` branchiga to‘liq push qilingan (`85dd52a`).

---

## 📌 1. Qisqacha Xulosa (Executive Summary)

Ushbu bosqichda tizimning **ishonchliligini bank talablari darajasiga ko‘tarish**, **AWS Bedrock Claude Sonnet 4.5 modelining gallyutsinatsiyalarini 100% to‘sish**, **qonunchilik korpusini to‘liq integratsiya qilish** va **barcha 5 ta Verifier darvozalarini mustahkamlash** amalga oshirildi. 

Koddagi 3 ta jiddiy xavfsizlik teshigi (loophole) yopildi va ularni tekshirish uchun 26 ta maxsus stress-test yozildi.

---

## 🛡️ 2. Verifier Qatlamidagi Muhim Tuzatishlar (Anti-Hallucination Hardening)

LLM agenti (Claude Sonnet 4.5) to‘qib chiqargan raqam yoki xulosalar bank tizimiga o‘tib ketmasligi uchun quyidagi tuzatishlar kiritildi:

### 2.1. Gate 4 (Mustaqil Arifmetika) — Katta bo‘shliq (Bypass loophole) yopildi
* **Muammo:** Ilgari `switch (claim.ClaimType) case ... when values.Length >= 3 && values.All(v => v.HasValue)` kabi shart qo‘llangan edi. Agar Sonnet 4.5 son o‘rniga matn (`"N/A"`, `"one-hundred"`) qaytarsa yoki parametrlardan birini tushirib qoldirsa, `when` sharti bajarilmay qolib, `switch` dan sakrab o‘tardi va darvoza jimgina `true` (muvaffaqiyatli) qaytarardi!
* **Tuzatish:** Har bir arifmetik tur (`INVOICE_TOTAL_CZK`, `VAT_CALCULATION`, `FX_CONVERSION`, `VELOCITY_RATIO`) uchun qat'iy tekshiruv kiritildi. Agar sonlar yetarli bo‘lmasa yoki parse qilinmasa, darhol fail-closed (`invalid parameters`) xatosi bilan to‘xtatiladi.

### 2.2. Gate 2 (Tool-Scope & Multi-Hop Invariant) — 1-Hopdagi qulash to‘g‘rilandi
* **Muammo:** Agar agent surishtiruvni atigi 1 ta hop bilan muvaffaqiyatli yakunlasa (`hops.Count == 1`), kod shartsiz `hops[1]` ga murojaat qilardi. Natijada `IndexOutOfRangeException` bilan tizim qulardi.
* **Tuzatish:** 1-hop holati to‘g‘ri qabul qilinadigan qilindi. 2-hop ICO tekshiruvi faqat ikkinchi chaqiruv mavjud bo‘lgandagina (`count == 2`) bajariladi.

### 2.3. Gate 5 (Claim Grounding) — Noto‘g‘ri sintaksisdagi pointerlar xavfsizlandi
* **Muammo:** Model JSON pointer boshida `/` belgisini qo‘yishni unutsa (`client/pep_flag`), `JsonPointerResolver.Resolve` xatoni `ArgumentException` sifatida uloqtirib, butun tahlil jarayonini to‘xtatib qo‘yardi.
* **Tuzatish:** `Gate5_ClaimGrounding` barcha istisnolarni xavfsiz ushlaydi va ularni `pointer did not ground` xatosi sifatida qaytarib, qarorni qonuniy ravishda fail-closed (`ESCALATE`) ga yo‘naltiradi.

### 2.4. VerifierPipeline — Global Fail-Closed himoyasi
* `VerifierPipeline.Evaluate` ga umumiy `try/catch` o‘rnatildi.
* Darvozalardagi umumiy xato nomlari o‘rniga aniq sabablar (`g.Reason`) auditga uzatiladigan qilindi.

---

## 🧪 3. Yangi Testlar To‘plami ([`HallucinationRejectionTests.cs`](file:///f:/APIS/Hakaton/veritriage-hackathon/tests/PayShield.Tests/HallucinationRejectionTests.cs))

Claude Sonnet 4.5 ning barcha xatolik turlarini sinovdan o‘tkazish uchun **26 ta yangi test** qo‘shildi:
1. **Gate 1:** Noto‘g‘ri maydonlar, pointerlar va qiymatlar soni teng emasligi.
2. **Gate 2:** 3-hop chaqiruvi, Hop 2 da begona kompaniyaga o‘tib ketish, 1-hoplik toza o‘tish.
3. **Gate 3:** Textract OCR ishonchliligi < 99% bo‘lganda rad etish, PDF dan boshqa raqam o‘qib to‘qima raqamga asoslanish, kordinatalar chegaradan chiqib ketishi.
4. **Gate 4:** Noto‘g‘ri qo‘shish ($100 + 21 = 150$), noto‘g‘ri QQS, nostandart QQS stavkasi (15%), valyuta ayirboshlash xatolari, son bo‘lmagan qiymatlar.
5. **Gate 5:** Mavjud bo‘lmagan pointerni to‘qib chiqarish, mavjud ko‘rsatkichga soxta raqam yozish, slesh belgisisiz pointer.
6. **Pipeline:** 3 ta da'vodan 1 tasi yolg‘on bo‘lsa ham, umumiy natija fail-closed (`Valid == false`) bo‘lishi isboti.

---

## ⚖️ 4. Qonunchilik Korpusi Integratsiyasi (Legal Corpus)

* Chexiya AML qonuni (Act No. 253/2008 Sb.) va CNB qarori (Decree 67/2018) bo‘yicha **12 ta me'yoriy modda** JSON formatida kiritildi (`legal/corpus/`):
  * `AML-253-2008-S6-1A` / `1B` / `1C` — Shubhali tranzaksiya belgilari.
  * `AML-253-2008-S9-2B` — Mijozni tekshirish (Due Diligence).
  * `AML-253-2008-S18-1` / `S21-2` / `S21-5` — PEP shaxslar va hisobot berish tartibi.
  * `CNB-67-2018-S7` / `S8-2` / `S12` — 4-ko‘z prinsipi va avtomatlashtirilgan monitoring talablari.
  * `FAU-GL-04-EBA-2021` — Yevropa bank agentligi ko‘rsatmalari.
* `LegalCorpus.cs` ushbu korpusni papkadan dinamik yuklash va moddalar bo‘yicha qidiruv imkoniyatiga ega bo‘ldi.

---

## 📊 5. Tranzaksiyalar Indeksi va Forensika Hardening

* **`CnbTransactionIndex.cs`:** 397,853 tranzaksiya va 5,493 mijoz ma'lumotlarini ~37ms da yuklash optimizatsiyasi saqlandi, umumiy kontragentlar (`SharedCounterpartyLinks`) va 72 soatlik klasterlash algoritmi barqarorlashtirildi.
* **`FinregDeliverableEngine.cs`:** 45 qatorli yakuniy tahliliy CSV deliverable hisob-kitobi (Base + Vol + PEP + Struct + Channel) va 4-ko‘z qoidasi buzilishini aniqlash (§ 21 AML / § 12 Decree) mustahkamlandi.
* **`PRODUCTION_GAPS.md`:** Bankning Model Risk Management (MRM) komandasi talab qiladigan validation paketlari va ishlab chiqarishdagi farqlar aniq qayd etildi.

---

## 📈 6. Yakuniy Test Natijalari

```bash
dotnet test
```

```text
Passed!  - Failed:     0, Passed:    59, Skipped:     0, Total:    59, Duration: 47 s - PayShield.Tests.dll (net9.0)
```

| Modul | Testlar soni | Holati |
|---|---|---|
| `HallucinationRejectionTests` | 26 | ✅ 100% O‘tgan |
| `VerifierGateTests` | 11 | ✅ 100% O‘tgan |
| `FinregDeliverableTests` | 11 | ✅ 100% O‘tgan |
| `RuleEngineTests` | 5 | ✅ 100% O‘tgan |
| `DeterministicLogicTests` | 2 | ✅ 100% O‘tgan |
| `GoldenTests` | 1 | ✅ 100% O‘tgan |
| `BedrockServiceTests` | 3 | ✅ 100% O‘tgan |
| **Jami** | **59** | **Barchasi yashil** |

---

## 🚀 7. Git Tarixi

* **Commit:** `85dd52a`
* **Xabar:** `feat(verifier): harden gates against LLM hallucinations and add adversarial tests`
* **Branch:** `origin/main`
* **O‘zgargan fayllar:** 28 ta fayl (+1173 qator, -85 qator).
