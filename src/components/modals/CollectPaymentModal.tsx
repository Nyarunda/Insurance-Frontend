import React, { useState } from 'react';
import { X, Check, Smartphone, Building, CreditCard, ShieldCheck, RefreshCw, Lock } from 'lucide-react';
import { recordsStore } from '../../data/recordsStore';
import { useHasPermission } from '../../store/permissionStore';
import { FieldError, HorizonAlert, HorizonLoader, ValidationSummary } from '../horizon';

const KENYAN_PHONE_PATTERN = /^(0|\+254)\d{9}$/;

export interface PayableCustomer {
  id: string;
  name: string;
  phone: string;
  outstandingKes: number;
}

interface CollectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: PayableCustomer;
  policyNumber?: string;
  onSuccess: (receiptRef: string) => void;
}

export const CollectPaymentModal: React.FC<CollectPaymentModalProps> = ({
  isOpen,
  onClose,
  customer,
  policyNumber,
  onSuccess,
}) => {
  const canCollectPayment = useHasPermission('billing', 'add');
  const [method, setMethod] = useState<'mpesa' | 'bank'>('mpesa');
  const [amount, setAmount] = useState<number>(customer.outstandingKes > 0 ? customer.outstandingKes : 182450);
  const [phone, setPhone] = useState(customer.phone);
  const [bankRef, setBankRef] = useState('CBK-RTGS-990142');
  const [status, setStatus] = useState<'idle' | 'pushing' | 'waiting_pin' | 'success'>('idle');
  const [receiptRef, setReceiptRef] = useState('');
  const [attempted, setAttempted] = useState(false);

  if (!isOpen) return null;

  const errors: Record<string, string> = {};
  if (!(amount > 0)) errors.amount = 'Collection amount must be greater than zero.';
  if (method === 'mpesa' && !KENYAN_PHONE_PATTERN.test(phone.trim())) {
    errors.phone = 'Enter a valid Safaricom number, e.g. 0712345678.';
  }
  if (method === 'bank' && !bankRef.trim()) {
    errors.bankRef = 'A bank / RTGS reference is required to record this wire.';
  }
  const hasErrors = Object.keys(errors).length > 0;

  const handleInitiatePayment = () => {
    if (hasErrors) {
      setAttempted(true);
      return;
    }
    if (method === 'mpesa') {
      setStatus('pushing');
      setTimeout(() => {
        setStatus('waiting_pin');
        setTimeout(() => {
          const generatedRef = `MP${Math.random().toString(36).substring(2, 8).toUpperCase()}9K`;
          setReceiptRef(generatedRef);
          recordsStore.recordPayment(customer.id, amount, 'M-Pesa Express STK Push', generatedRef, policyNumber);
          setStatus('success');
        }, 1400);
      }, 1000);
    } else {
      const generatedRef = bankRef;
      setReceiptRef(generatedRef);
      recordsStore.recordPayment(customer.id, amount, 'Pesalink / Bank RTGS', generatedRef, policyNumber);
      setStatus('success');
    }
  };

  const handleComplete = () => {
    onSuccess(receiptRef);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                TREASURY INFLOW
              </span>
              <h2 className="text-base font-bold text-slate-900">Collect Premium Payment</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Customer: {customer.name} ({customer.id})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {status === 'idle' && (
            <>
              {/* Method Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMethod('mpesa');
                    setAttempted(false);
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                    method === 'mpesa'
                      ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 ring-1 ring-emerald-500'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>M-Pesa STK Push</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMethod('bank');
                    setAttempted(false);
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                    method === 'bank'
                      ? 'border-teal-600 bg-teal-50/50 text-teal-900 ring-1 ring-teal-500'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Building className="w-4 h-4 text-teal-600" />
                  <span>Pesalink / RTGS</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Collection Amount (KES)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full text-base font-mono font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Current Outstanding Balance:</span>
                  <span className="font-mono font-bold text-rose-600">
                    KES {customer.outstandingKes.toLocaleString()}
                  </span>
                </div>
                {attempted && <FieldError message={errors.amount} />}
              </div>

              {method === 'mpesa' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Customer Safaricom Mobile Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <span className="text-xs text-slate-500 mt-1 block">
                    Instant STK Push prompt will be dispatched to this handset.
                  </span>
                  {attempted && <FieldError message={errors.phone} />}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bank Swift / RTGS Reference
                  </label>
                  <input
                    type="text"
                    value={bankRef}
                    onChange={(e) => setBankRef(e.target.value)}
                    className="w-full text-xs font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  {attempted && <FieldError message={errors.bankRef} />}
                </div>
              )}

              {attempted && <ValidationSummary errors={Object.values(errors)} />}
            </>
          )}

          {status === 'pushing' && (
            <HorizonLoader tip="Initiating STK Push gateway" />
          )}

          {status === 'waiting_pin' && (
            <div className="py-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto animate-bounce">
                <Smartphone className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="text-sm font-bold text-slate-900">Awaiting Customer M-Pesa PIN</div>
              <p className="text-xs text-slate-500">
                Prompt delivered to <span className="font-mono font-bold text-slate-800">{phone}</span> for KES {amount.toLocaleString()}
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-6 text-center space-y-3">
              <HorizonAlert tone="success" title="Payment cleared">
                Receipt posted and customer ledger updated.
              </HorizonAlert>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono space-y-1 text-slate-700">
                <div className="flex justify-between">
                  <span>Transaction Ref:</span>
                  <span className="font-bold text-emerald-700">{receiptRef}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Credited:</span>
                  <span>KES {amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer Ledger:</span>
                  <span className="text-slate-900 font-bold">Updated Instant</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
          {status === 'idle' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canCollectPayment}
                onClick={handleInitiatePayment}
                title={canCollectPayment ? undefined : "You don't have billing permission to collect payments."}
                className="px-4 py-1.5 rounded-lg bg-[var(--hz-primary-700)] hover:bg-[var(--hz-primary-800)] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {canCollectPayment ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{method === 'mpesa' ? 'Send STK Push Now' : 'Record Bank Wire'}</span>
              </button>
            </>
          )}

          {status === 'success' && (
            <button
              type="button"
              onClick={handleComplete}
              className="w-full px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
            >
              Done & Refresh Customer Account
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
