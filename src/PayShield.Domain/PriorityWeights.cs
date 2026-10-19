namespace VeriTriage.Domain;

public sealed record BaseWeightConfig(int Low, int Medium, int High, string Source, string Rationale);
public sealed record VolumeWeightConfig(int PerUnitRatio, int Cap, string Source, string Rationale, int VelocityScale = 15);
public sealed record PepWeightConfig(int Weight, string Source, string Rationale);
public sealed record StructWeightConfig(int Weight, string Source, string Rationale);
public sealed record ChannelWeightConfig(int Weight, string Source, string Rationale);

public sealed record PriorityWeights(
    BaseWeightConfig Base,
    VolumeWeightConfig Volume,
    PepWeightConfig Pep,
    StructWeightConfig Structuring,
    ChannelWeightConfig Channel)
{
    public int MaxRaw => Base.High + Volume.Cap + Pep.Weight + Structuring.Weight + Channel.Weight;

    public static PriorityWeights StatutoryDefaults { get; } = new(
        new BaseWeightConfig(10, 25, 40, "FATF Risk-Based Approach Guidance § 3.2", "Higher KYC risk tier contributes linearly"),
        new VolumeWeightConfig(10, 30, "ČNB Decree 67/2018 § 6(1)", "Each 10% deviation above expected adds 10 points"),
        new PepWeightConfig(25, "Act 253/2008 § 9a (PEP enhanced due diligence)", "PEP flag is a statutory escalation trigger"),
        new StructWeightConfig(20, "Act 253/2008 § 6(1)(b)", "Sub-threshold patterns are a defined typology"),
        new ChannelWeightConfig(10, "ČNB Decree 67/2018 § 6(2)", "New remote-channel clients carry elevated onboarding risk"));
}
