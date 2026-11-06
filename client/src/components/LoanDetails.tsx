import type { Loan } from "../lib/api";
import { DetailList } from "./DetailList";

export function LoanDetails({ loan }: { loan: Loan }) {
  return <DetailList items={[
    { term: "Loan", value: loan.id },
    { term: "Borrower", value: loan.borrower_id },
    { term: "Equipment", value: loan.equipment_id },
    { term: "Quantity", value: loan.quantity_borrowed },
    { term: "Status", value: "Active" },
    { term: "Checked out", value: new Date(loan.checkout_at).toLocaleString("en-GB", { timeZone: "Asia/Bangkok" }) + " (Asia/Bangkok)" },
    { term: "Due date", value: loan.due_on },
  ]} />;
}
