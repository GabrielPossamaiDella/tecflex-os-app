interface Props {
  status: string;
}

const labels: Record<string, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
};

export default function StatusBadge({ status }: Props) {
  const cls =
    status === 'aberta'
      ? 'badge-aberta'
      : status === 'em_andamento'
        ? 'badge-em-andamento'
        : 'badge-concluida';

  return <span className={cls}>{labels[status] ?? status}</span>;
}
