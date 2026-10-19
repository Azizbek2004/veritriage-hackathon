namespace VeriTriage.Domain;

public sealed record LegalProvision(
    string ClauseId,
    string Citation,
    string Title,
    string CzechText,
    string EnglishSummary,
    string Url,
    string RetrievedAt);

public static class LegalQuotes
{
    public static readonly IReadOnlyDictionary<string, LegalProvision> All = new Dictionary<string, LegalProvision>(StringComparer.Ordinal)
    {
        ["AML-253-2008-S6-1A"] = new LegalProvision("AML-253-2008-S6-1A", "Act No. 253/2008 Coll. (Czech AML Act) § 6(1)(a)", "Suspicious Transaction — Unusual Volume or Character", "Podezřelým obchodem se rozumí obchod uskutečněný za okolností vyvolávajících podezření ze snahy o legalizaci výnosů z trestné činnosti, zejména výrazný nepoměr objemu nebo povahy obchodu k dosavadní činnosti nebo majetkovým poměrům klienta.", "Transaction volume or nature is demonstrably disproportionate to the client's declared business profile or historical baseline.", "https://www.zakonyprolidi.cz/cs/2008-253#p6", "2026-10-19T17:30:00+02:00"),
        ["AML-253-2008-S6-1B"] = new LegalProvision("AML-253-2008-S6-1B", "Act No. 253/2008 Coll. (Czech AML Act) § 6(1)(b)", "Suspicious Transaction — Structuring / Smurfing", "Podezřelým obchodem je obchod, u něhož dochází k účelovému dělení transakcí na menší částky s cílem vyhnout se identifikační nebo kontrolní povinnosti.", "Deliberate splitting of transfers into sub-threshold amounts to evade statutory AML identification or monitoring thresholds.", "https://www.zakonyprolidi.cz/cs/2008-253#p6", "2026-10-19T17:30:00+02:00"),
        ["AML-253-2008-S21-2"] = new LegalProvision("AML-253-2008-S21-2", "Act No. 253/2008 Coll. (Czech AML Act) § 21(2)", "System of Internal Principles (Systém vnitřních zásad)", "Povinná osoba zavede a uplatňuje odpovídající strategie a postupy vnitřní kontroly a komunikace ke zmírňování a účinnému řízení rizik legalizace výnosů z trestné činnosti.", "Obligation to enforce deterministic internal control procedures and risk-scoring methodologies.", "https://www.zakonyprolidi.cz/cs/2008-253#p21", "2026-10-19T17:30:00+02:00"),
        ["AML-253-2008-S21-5"] = new LegalProvision("AML-253-2008-S21-5", "Act No. 253/2008 Coll. (Czech AML Act) § 21(5)", "Politically Exposed Person (PEP) Senior Management Approval", "Pokračování v obchodním vztahu nebo provedení obchodu s politicky exponovanou osobou podléhá souhlasu člena statutárního orgánu nebo osoby pověřené řízením v oblasti AML.", "Any continuation of business or execution of anomalous transactions involving a PEP requires explicit approval from a statutory body member or designated MLRO.", "https://www.zakonyprolidi.cz/cs/2008-253#p21", "2026-10-19T17:30:00+02:00"),
    };

    public static LegalProvision? Get(string clauseId) => All.GetValueOrDefault(clauseId);
}
