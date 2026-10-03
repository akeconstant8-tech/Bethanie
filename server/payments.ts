import { config } from './config.ts';
import { HttpError } from './http.ts';

/**
 * Point d'entrée des paiements.
 *
 * Aujourd'hui : fournisseur « simulation » (aucun argent ne circule).
 * Pour passer en réel avec un agrégateur Mobile Money (CinetPay, PayDunya, Paystack…) :
 *   1. `startPayment` appelle l'API de l'agrégateur et renvoie son URL de paiement ;
 *   2. la route POST /api/payments/webhook vérifie la signature de l'agrégateur
 *      puis appelle `markOrderPaid` (voir routes/orders.ts) ;
 *   3. on retire la route de simulation POST /api/orders/:id/pay.
 * Les numéros de carte ne doivent jamais transiter par ce serveur : la saisie se fait
 * sur la page sécurisée de l'agrégateur.
 */
export interface PaymentStart {
  provider: string;
  /** URL vers laquelle rediriger le client (paiement réel), absente en simulation. */
  redirectUrl?: string;
}

export const startPayment = (_orderId: string, _amount: number, _method: string): PaymentStart => {
  if (config.paymentProvider === 'simulation') return { provider: 'simulation' };
  throw new HttpError(501, `Fournisseur de paiement « ${config.paymentProvider} » non configuré.`);
};

export const isSimulation = () => config.paymentProvider === 'simulation';
