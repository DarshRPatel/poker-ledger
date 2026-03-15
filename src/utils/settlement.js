/* ==========================================
   Settlement Algorithm (Greedy Min-Transactions)
   P2: graph-based algorithm for max efficiency
   ========================================== */

/**
 * Calculate settlements — who pays whom to settle debts.
 * Uses a greedy approach that minimises the number of transactions.
 *
 * @param {Array} balances - [ { name: string, netRS: number } ]
 *   Positive netRS = player won (is owed money)
 *   Negative netRS = player lost (owes money)
 * @returns {Array} - [ { from: string, to: string, amount: number } ]
 */
export function calculateSettlements(balances) {
  // Deep copy and filter out zero-balance players
  let creditors = []; // players who won (positive net)
  let debtors = [];   // players who lost (negative net)

  for (const b of balances) {
    const rounded = Math.round(b.netRS * 100) / 100;
    if (rounded > 0) {
      creditors.push({ name: b.name, amount: rounded });
    } else if (rounded < 0) {
      debtors.push({ name: b.name, amount: Math.abs(rounded) });
    }
  }

  // Sort descending by amount for greedy matching
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const credit = creditors[i];
    const debt = debtors[j];
    const transferAmount = Math.min(credit.amount, debt.amount);

    if (transferAmount > 0) {
      settlements.push({
        from: debt.name,
        to: credit.name,
        amount: Math.round(transferAmount * 100) / 100,
      });
    }

    credit.amount -= transferAmount;
    debt.amount -= transferAmount;

    if (credit.amount < 0.01) i++;
    if (debt.amount < 0.01) j++;
  }

  return settlements;
}
