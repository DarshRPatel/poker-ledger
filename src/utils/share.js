export function formatSessionText(session, settlements) {
  if (!session) return '';

  const formatDuration = (mins) => {
    if (!mins) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} hr`;
    return `${h} hr ${m} min`;
  };

  const totalBuyIns = session.players.reduce((sum, p) => sum + p.buyIns, 0);
  const sortedPlayers = [...session.players].sort(
    (a, b) => (b.netRS || 0) - (a.netRS || 0)
  );

  let text = `🃏 Session #${session.sessionNumber} Summary\n`;
  text += `--------------------------------\n`;
  text += `💰 Total Pot: ₹${session.totalPotRS?.toLocaleString()}\n`;
  text += `👥 Players: ${session.players.length} | Buy-ins: ${totalBuyIns}\n`;
  text += `⏱️ Duration: ${formatDuration(session.durationMinutes)}\n`;
  text += `--------------------------------\n\n`;

  text += `♠ Leaderboard:\n`;
  sortedPlayers.forEach((p, idx) => {
    const buyInRS = p.buyIns * session.buyInAmount;
    const outRS = Math.round((p.remainingChips / session.ratio) * 100) / 100;
    const net = p.netRS || 0;
    const sign = net > 0 ? '+' : net < 0 ? '-' : '';
    const rankStr = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
    text += `${rankStr} ${p.name}: ${sign}₹${Math.abs(Math.round(net))} (In: ₹${buyInRS}, Out: ₹${outRS})\n`;
  });
  text += `\n`;

  if (settlements && settlements.length > 0) {
    text += `♥ Settlements:\n`;
    settlements.forEach((s) => {
      text += `👉 ${s.from} owes ₹${Math.round(s.amount)} to ${s.to}\n`;
    });
    text += `\n`;
  }

  text += `Shared via Poker Ledger ♠️♥️♦️♣️`;
  return text;
}
