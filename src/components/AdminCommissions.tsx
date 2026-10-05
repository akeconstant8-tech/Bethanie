import React, { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../api/client';
import { TransactionReport } from '../types';
import { useI18n } from '../i18n';
import { formatPrice } from '../utils/commerce';
import { CountUp, Skeleton, cardClass } from './ui';

/**
 * Carte « Commissions Béthanie » du Profil, visible des administrateurs seulement : commission de 5 % perçue et à
 * percevoir, résultat du contrôle des transactions (écarts, intégrité du journal scellé). Données : GET /api/admin/transactions.
 */
export const AdminCommissions: React.FC = () => {
  const { t } = useI18n();
  const [report, setReport] = useState<TransactionReport | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      setReport(await api.adminTransactions());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const healthy = report && report.anomalies.length === 0 && report.journal.intact && report.journal.nonScellees === 0;

  return (
    <section className={`${cardClass} p-4 lg:p-5 space-y-3.5 animate-rise-in`} aria-labelledby="admin-commissions">
      <div className="flex items-center justify-between gap-3">
        <h2 id="admin-commissions" className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-gold-100 text-gold-700 flex items-center justify-center">
            <i className="fa-solid fa-scale-balanced text-sm"></i>
          </span>
          {t('admin.commissions.title', { rate: report?.taux ?? 5 })}
        </h2>
        <button
          onClick={load}
          disabled={busy}
          className="text-xs font-semibold text-brand-900 hover:underline cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
        >
          <i className={`fa-solid fa-rotate-right ${busy ? 'fa-spin' : ''}`}></i>
          {t('admin.check')}
        </button>
      </div>

      {error ? (
        <p className="animate-shake text-sm text-red-600 font-semibold">{error}</p>
      ) : !report ? (
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-brand-50 p-3">
              <p className="text-xs text-brand-700 font-medium">{t('admin.commissions.collected')}</p>
              <p className="text-lg font-display font-bold text-brand-900 tabular-nums">
                <CountUp value={report.commissionAcquise} format={formatPrice} />
              </p>
              <p className="text-[11px] text-slate-500">{t('admin.commissions.onSales', { amount: formatPrice(report.ventesPayees) })}</p>
            </div>
            <div className="rounded-xl bg-surface-light p-3">
              <p className="text-xs text-slate-600 font-medium">{t('admin.commissions.pending')}</p>
              <p className="text-lg font-display font-bold text-slate-800 tabular-nums">
                <CountUp value={report.commissionPrevue} format={formatPrice} />
              </p>
              <p className="text-[11px] text-slate-500">{t('admin.commissions.onPendingSales', { amount: formatPrice(report.ventesEnAttente) })}</p>
            </div>
          </div>

          <div
            role="status"
            className={`rounded-xl px-3 py-2.5 text-xs font-medium flex items-start gap-2 ${
              healthy ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
            }`}
          >
            <i className={`fa-solid ${healthy ? 'fa-shield-halved' : 'fa-triangle-exclamation animate-wiggle'} mt-0.5`}></i>
            <span className="space-y-0.5">
              {healthy ? (
                <span className="block">{t('admin.control.ok', { n: report.commandesControlees })}</span>
              ) : (
                <>
                  {report.anomalies.length > 0 && <span className="block">{t('admin.control.anomalies', { n: report.anomalies.length })}</span>}
                  {!report.journal.intact && <span className="block">{t('admin.control.tampered', { line: report.journal.premiereLigneAlteree ?? '?', cause: report.journal.cause ?? '' })}</span>}
                  {report.journal.intact && report.journal.nonScellees > 0 && (
                    <span className="block">{t('admin.control.unsealed', { n: report.journal.nonScellees })}</span>
                  )}
                </>
              )}
              {report.transactionsRefusees > 0 && <span className="block">{t('admin.control.refused', { n: report.transactionsRefusees })}</span>}
            </span>
          </div>

          {report.parBoutique.length > 0 && (
            <div>
              <button
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 cursor-pointer"
              >
                {t('admin.byShop')}
                <i className={`fa-solid fa-chevron-down transition-transform duration-300 ${open ? 'rotate-180' : ''}`}></i>
              </button>
              {open && (
                <ul className="stagger mt-2 divide-y divide-slate-100 text-xs">
                  {report.parBoutique.map((shop) => (
                    <li key={shop.boutique} className="py-2 flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate font-medium text-slate-800">{shop.boutique}</span>
                      <span className="text-right tabular-nums shrink-0">
                        <span className="block font-semibold text-brand-900">{formatPrice(shop.commissionAcquise)}</span>
                        <span className="block text-slate-400">
                          +{formatPrice(shop.commissionPrevue)} · {t('admin.sellerShare', { amount: formatPrice(shop.partVendeurs) })}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {report.anomalies.length > 0 && (
            <ul className="text-[11px] text-red-700 space-y-1">
              {report.anomalies.slice(0, 5).map((a) => (
                <li key={a.commande}>
                  <strong>#{a.commande}</strong> : {a.ecarts.join(' ; ')}
                </li>
              ))}
            </ul>
          )}
          {report.journal.scelle.startsWith('empreinte') && <p className="text-[11px] text-amber-700">{t('admin.sealWeak')}</p>}
        </>
      )}
    </section>
  );
};
