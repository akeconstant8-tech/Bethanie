import React, { useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../api/client';
import { AssistantProposal } from '../types';
import { TranslationKey, useI18n } from '../i18n';
import { formatPrice } from '../utils/commerce';
import { BottomSheet, btnOutline, btnPrimary } from './ui';

/**
 * Assistant vendeur (IA Claude, voir docs/AGENT_VENDEUR.md) : conversation dans un panneau, et propositions
 * (brouillon de fiche, stock, étape de commande) que le vendeur confirme lui-même. Rien n'est modifié sans son clic :
 * les boutons appellent les mêmes fonctions que l'espace vendeur, avec les mêmes règles côté serveur.
 */

interface Turn {
  role: 'user' | 'assistant';
  text: string;
  proposals?: AssistantProposal[];
  /** Message d'erreur affiché, non renvoyé à l'assistant. */
  notice?: boolean;
}

type CardState = { status: 'idle' | 'busy' | 'done' | 'ignored' } | { status: 'error'; message: string };

const SUGGESTIONS: TranslationKey[] = [
  'assistant.suggest.draft',
  'assistant.suggest.stock',
  'assistant.suggest.orders',
  'assistant.suggest.summary',
];

/** Mise en forme légère des réponses : listes à puces et passages en gras, sans HTML injecté. */
const RichText: React.FC<{ text: string }> = ({ text }) => {
  const inline = (line: string) =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <React.Fragment key={i}>{part}</React.Fragment>
    );
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={blocks.length} className="list-disc pl-5 space-y-0.5">
          {bullets.map((b, i) => (
            <li key={i}>{inline(b)}</li>
          ))}
        </ul>
      );
      bullets = [];
    }
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const bullet = /^([-*•]|\d+\.)\s+(.*)$/.exec(line);
    if (bullet) {
      bullets.push(bullet[2]);
      continue;
    }
    flush();
    if (line) blocks.push(<p key={blocks.length}>{inline(line.replace(/^#+\s*/, ''))}</p>);
  }
  flush();
  return <div className="space-y-2">{blocks}</div>;
};

export const SellerAssistant: React.FC<{
  open: boolean;
  onClose: () => void;
  firstName: string;
  onUpdateStock: (productId: string, stock: number) => Promise<void>;
  onAdvanceOrder: (orderId: string) => Promise<void>;
  onUseDraft: (draft: Extract<AssistantProposal, { kind: 'product' }>) => void;
}> = ({ open, onClose, firstName, onUpdateStock, onAdvanceOrder, onUseDraft }) => {
  const { t, lang, categoryName, statusLabel } = useI18n();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [cards, setCards] = useState<Record<string, CardState>>({});
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [turns, busy, cards]);

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    const next: Turn[] = [...turns, { role: 'user', text }];
    setTurns(next);
    setInput('');
    setBusy(true);
    try {
      const history = next.filter((turn) => !turn.notice).slice(-20).map(({ role, text }) => ({ role, text }));
      const { reply, proposals } = await api.sellerAssistant(history, lang);
      setTurns((current) => [...current, { role: 'assistant', text: reply, proposals }]);
    } catch (error) {
      setTurns((current) => [...current, { role: 'assistant', text: errorMessage(error), notice: true }]);
    } finally {
      setBusy(false);
    }
  };

  const act = async (proposal: AssistantProposal) => {
    if (proposal.kind === 'product') {
      onUseDraft(proposal);
      setCards((c) => ({ ...c, [proposal.id]: { status: 'done' } }));
      onClose();
      return;
    }
    setCards((c) => ({ ...c, [proposal.id]: { status: 'busy' } }));
    try {
      if (proposal.kind === 'stock') await onUpdateStock(proposal.productId, proposal.to);
      else await onAdvanceOrder(proposal.orderId);
      setCards((c) => ({ ...c, [proposal.id]: { status: 'done' } }));
    } catch (error) {
      setCards((c) => ({ ...c, [proposal.id]: { status: 'error', message: errorMessage(error) } }));
    }
  };

  const card = (proposal: AssistantProposal) => {
    const state = cards[proposal.id] ?? { status: 'idle' };
    const [icon, heading] =
      proposal.kind === 'product'
        ? ['fa-file-pen', t('assistant.draft')]
        : proposal.kind === 'stock'
          ? ['fa-boxes-stacked', t('assistant.stockChange')]
          : ['fa-truck-fast', t('assistant.orderAdvance')];
    return (
      <div key={proposal.id} className="animate-scale-in rounded-2xl border border-brand-900/15 bg-white shadow-soft p-3.5 space-y-2.5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
          <i className={`fa-solid ${icon}`}></i>
          {heading}
        </p>
        {proposal.kind === 'product' && (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">{proposal.title}</p>
            <p className="text-xs text-slate-500">
              {categoryName(proposal.category)}
              {proposal.price !== undefined && ` · ${formatPrice(proposal.price)}`}
              {proposal.stock !== undefined && ` · ${t('assistant.stockLabel', { n: proposal.stock })}`}
            </p>
            <p className="text-sm text-slate-700 line-clamp-4 whitespace-pre-line">{proposal.description}</p>
          </div>
        )}
        {proposal.kind === 'stock' && (
          <p className="text-sm text-slate-800">
            <strong>{proposal.title}</strong> : {proposal.from} → <strong className="text-brand-900">{proposal.to}</strong>
          </p>
        )}
        {proposal.kind === 'order' && (
          <p className="text-sm text-slate-800">
            <strong>#{proposal.orderId}</strong> : {statusLabel(proposal.from)} → <strong className="text-brand-900">{statusLabel(proposal.to)}</strong>
          </p>
        )}
        {state.status === 'done' ? (
          <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
            <i className="fa-solid fa-circle-check animate-pop"></i>
            {t('assistant.done')}
          </p>
        ) : state.status === 'ignored' ? (
          <p className="text-xs text-slate-400">{t('assistant.ignored')}</p>
        ) : (
          <>
            {state.status === 'error' && <p className="animate-shake text-xs font-semibold text-red-600">{state.message}</p>}
            <div className="flex gap-2">
              <button onClick={() => act(proposal)} disabled={state.status === 'busy'} className={`${btnPrimary} flex-1 h-10 text-sm`}>
                {state.status === 'busy' ? <i className="fa-solid fa-circle-notch fa-spin"></i> : null}
                {proposal.kind === 'product' ? t('assistant.fillForm') : t('assistant.confirm')}
              </button>
              <button
                onClick={() => setCards((c) => ({ ...c, [proposal.id]: { status: 'ignored' } }))}
                disabled={state.status === 'busy'}
                className={`${btnOutline} h-10 px-4 text-sm`}
              >
                {t('assistant.ignore')}
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <BottomSheet
      open={open}
      title={t('assistant.title')}
      onClose={onClose}
      footer={
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('assistant.placeholder')}
            aria-label={t('assistant.placeholder')}
            maxLength={4000}
            className="flex-1 min-w-0 h-11 rounded-xl border border-slate-200 px-3.5 text-sm focus:outline-none focus:border-brand-900 focus:ring-2 focus:ring-brand-900/10"
          />
          <button type="submit" disabled={busy || !input.trim()} className={`${btnPrimary} w-11 h-11 shrink-0`} aria-label={t('assistant.send')}>
            <i className="fa-solid fa-paper-plane"></i>
          </button>
        </form>
      }
    >
      <div className="space-y-3 text-sm leading-relaxed" aria-live="polite">
        <div className="flex gap-2.5 animate-rise-in">
          <span className="w-8 h-8 rounded-full bg-linear-to-br from-brand-700 to-brand-900 text-gold-400 flex items-center justify-center shrink-0">
            <i className="fa-solid fa-wand-magic-sparkles text-xs"></i>
          </span>
          <div className="bg-surface-light rounded-2xl rounded-tl-md px-3.5 py-2.5 text-slate-800">{t('assistant.intro', { name: firstName })}</div>
        </div>

        {turns.length === 0 && (
          <div className="stagger flex flex-wrap gap-2 pl-10">
            {SUGGESTIONS.map((key) => (
              <button
                key={key}
                onClick={() => ask(t(key))}
                className="text-xs font-medium text-brand-900 bg-brand-50 hover:bg-brand-100 border border-brand-900/10 rounded-full px-3 py-1.5 cursor-pointer"
              >
                {t(key)}
              </button>
            ))}
          </div>
        )}

        {turns.map((turn, i) =>
          turn.role === 'user' ? (
            <div key={i} className="flex justify-end animate-rise-in">
              <p className="max-w-[85%] bg-brand-900 text-white rounded-2xl rounded-tr-md px-3.5 py-2.5 whitespace-pre-line">{turn.text}</p>
            </div>
          ) : (
            <div key={i} className="flex gap-2.5 animate-rise-in">
              <span className="w-8 h-8 rounded-full bg-linear-to-br from-brand-700 to-brand-900 text-gold-400 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-wand-magic-sparkles text-xs"></i>
              </span>
              <div className="flex-1 min-w-0 space-y-2.5">
                <div
                  className={`rounded-2xl rounded-tl-md px-3.5 py-2.5 ${
                    turn.notice ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-surface-light text-slate-800'
                  }`}
                >
                  <RichText text={turn.text} />
                </div>
                {turn.proposals?.map(card)}
              </div>
            </div>
          )
        )}

        {busy && (
          <div className="flex items-center gap-2.5 pl-10 text-xs text-slate-500" role="status">
            <span className="flex gap-1" aria-hidden="true">
              {[0, 150, 300].map((delay) => (
                <span key={delay} className="w-1.5 h-1.5 rounded-full bg-brand-700 animate-bounce" style={{ animationDelay: `${delay}ms` }}></span>
              ))}
            </span>
            {t('assistant.thinking')}
          </div>
        )}
        <p className="text-[11px] text-slate-400 text-center pt-1">{t('assistant.disclaimer')}</p>
        <div ref={end}></div>
      </div>
    </BottomSheet>
  );
};
