namespace VeriTriage.Domain;

public static class ApprovalPolicy
{
    public static string? Validate(string? executive, string? approver)
    {
        if (string.IsNullOrWhiteSpace(approver)) return "approver_id is required";
        if (string.Equals(executive?.Trim(), approver.Trim(), StringComparison.OrdinalIgnoreCase))
            return FinregDeliverableEngine.FourEyesViolation;
        return null;
    }
}
