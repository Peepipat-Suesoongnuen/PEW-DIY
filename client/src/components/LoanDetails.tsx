import type { Loan } from "../lib/api";
import { DetailList } from "./DetailList";

export function LoanDetails({ loan, borrowerName, equipmentName }: { loan: Loan; borrowerName?: string; equipmentName?: string }) {
  return <DetailList items={[
    { term: "Loan", value: loan.id },
    { term: "Borrower", value: borrowerName ?? loan.borrower_id },
    { term: "Equipment", value: equipmentName ?? "Equipment details unavailable" },
    { term: "Quantity", value: loan.quantity_borrowed },
    { term: "Status", value: "Active" },
    { term: "Checked out", value: new Date(loan.checkout_at).toLocaleString("en-GB", { timeZone: "Asia/Bangkok" }) + " (Asia/Bangkok)" },
    { term: "Due date", value: loan.due_on },
  ]} />;
}
