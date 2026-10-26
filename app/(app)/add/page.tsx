import AddTransactionForm from "../../../components/add/AddTransactionForm";

export default function AddPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          Add
        </h1>
        <p className="text-sm text-stone-600">Log a credit or debit in a few taps.</p>
      </header>
      <AddTransactionForm />
    </div>
  );
}
