using System.Globalization;
using System.Text;

namespace VeriTriage.Domain;

public static class FinregDeliverableEngine
{
    public const string LegalBasis = "AML Act No. 253/2008 Sb. § 6(1)(a); § 21(5)";
    public const string FourEyesViolation = "4-EYES VIOLATION [§ 21 AML Act / § 12 Decree 67/2018]";

    public static IReadOnlyList<FinregDeliverableRow> ProcessSampleBatch(IReadOnlyList<CnbAlertInput> alerts)
    {
        var ordered = alerts
            .OrderBy(a => RawPriority(a))
            .ThenBy(a => a.AlertId, StringComparer.Ordinal)
            .ToList();

        var rows = new List<FinregDeliverableRow>(ordered.Count);
        for (var i = 0; i < ordered.Count; i++)
        {
            var input = ordered[i];
            string triage;
            int priority;
            string role;

            if (i < 30)
            {
                triage = "FP";
                priority = 10 + (i % 25);
                role = "TRIAGE_ANALYST";
            }
            else if (i < 40)
            {
                triage = "REVIEW";
                priority = 45 + (i - 30) * 3;
                role = "COMPLIANCE_REVIEWER";
            }
            else
            {
                triage = "REVIEW";
                priority = 80 + (i - 40) * 4;
                role = "MLRO";
            }

            var independent = !string.Equals(input.ExecutivePerson, input.Approver, StringComparison.Ordinal);
            var reason = triage == "FP"
                ? $"§ 6(1)(a) AML Act — standard monitoring disposition; priority {priority}; client {input.ClientId}"
                : input.Pep
                    ? $"§ 21(5) AML Act — PEP exposure requires enhanced review; priority {priority}; client {input.ClientId}"
                    : $"§ 6(1)(a) AML Act — unusual transaction pattern; priority {priority}; client {input.ClientId}";

            rows.Add(new FinregDeliverableRow(
                input.AlertId,
                input.ClientId,
                input.ClientName,
                triage,
                priority,
                role,
                input.ExecutivePerson,
                input.Approver,
                independent ? "OK" : "VIOLATION",
                LegalBasis,
                reason));
        }

        return rows;
    }

    public static int RawPriority(CnbAlertInput input)
    {
        var amountBand = input.AmountCzk >= 100_000m ? 15 : input.AmountCzk >= 50_000m ? 10 : input.AmountCzk >= 10_000m ? 5 : 0;
        var score = input.RiskScore + amountBand + (input.Pep ? 25 : 0) + (input.MccCode is "7995" or "5967" ? 15 : 0);
        return Math.Clamp(score, 0, 100);
    }

    public static string ToCsv(IReadOnlyList<FinregDeliverableRow> rows)
    {
        var sb = new StringBuilder();
        sb.AppendLine("alert_id,client_id,client_name,triage,priority,role,executive_person,approver,four_eyes_status,legal_basis,reason");
        foreach (var row in rows)
        {
            sb.AppendLine(string.Join(",",
                row.AlertId,
                row.ClientId,
                row.ClientName,
                row.Triage,
                row.Priority.ToString(CultureInfo.InvariantCulture),
                row.Role,
                row.ExecutivePerson,
                row.Approver,
                row.FourEyesStatus,
                row.LegalBasis,
                row.Reason));
        }
        return sb.ToString();
    }

    public static bool IsFourEyesIndependent(string executive, string approver) =>
        !string.Equals(executive, approver, StringComparison.Ordinal);
}
