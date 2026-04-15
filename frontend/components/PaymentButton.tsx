/**
 * PaymentButton Component
 * Reusable button for WIRE token payments
 * 
 * Usage:
 * <PaymentButton
 *   userAddress="0x..."
 *   wireAmount={ethers.parseEther("0.35")}
 *   purpose="donation"
 *   onSuccess={() => console.log('Payment successful!')}
 *   onError={(error) => console.error(error)}
 * />
 */

'use client';

import React, { useState } from 'react';
import { useBlockchainPayment, PaymentRequest } from '@/lib/hooks/useBlockchainPayment';
import { ethers } from 'ethers';

export interface PaymentButtonProps {
  userAddress?: string; // Can be provided or extracted from connected wallet
  wireAmount: string | bigint; // In wei
  purpose: 'donation' | 'ticket' | 'tip' | 'badge';
  label?: string;
  className?: string;
  disabled?: boolean;
  pkrAmount?: number;
  metadata?: any; // Accept any metadata
  onSuccess?: (txHash: string, blockNumber?: number) => void;
  onError?: (error: Error) => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  showFee?: boolean;
}

/**
 * PaymentButton - Complete payment flow in one component
 */
export const PaymentButton: React.FC<PaymentButtonProps> = ({
  userAddress,
  wireAmount,
  purpose,
  label = 'Pay with WIRE',
  className = '',
  disabled = false,
  pkrAmount,
  metadata,
  onSuccess,
  onError,
  variant = 'primary',
  size = 'md',
  showFee = true,
}) => {
  const {
    initiatePayment,
    executePayment,
    checkStatus,
    paymentState,
    resetPayment,
    isLoading,
    isSuccess,
    isError,
  } = useBlockchainPayment();

  const [step, setStep] = useState<'idle' | 'initiating' | 'confirming' | 'checkingStatus'>('idle');

  const handlePayment = async () => {
    try {
      // Validate address
      if (!userAddress || !ethers.isAddress(userAddress)) {
        throw new Error('Invalid wallet address');
      }

      // Store payment details for executePayment
      const wireAmountFormatted = typeof wireAmount === 'string'
        ? wireAmount
        : ethers.formatEther(wireAmount);

      // Create a mock session ID (no backend initiation needed for mock data)
      const txId = `SESSION-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      localStorage.setItem('pending_amount', wireAmountFormatted);
      localStorage.setItem('pending_matchId', metadata?.matchId || 'match_unknown');
      localStorage.setItem('pending_playerId', metadata?.playerId || 'player_unknown');
      localStorage.setItem('pending_quantity', metadata?.quantity ? String(metadata.quantity) : '1');
      localStorage.setItem('pending_purpose', purpose);
      localStorage.setItem('pending_email', localStorage.getItem('user_email') || 'user@example.com');
      localStorage.setItem('user_wallet', userAddress);

      // Step: Execute payment (opens MetaMask, sends WIRE tokens)
      setStep('confirming');
      const success = await executePayment({
        sessionId: txId,
        amount: wireAmountFormatted,
        walletAddress: userAddress,
      });

      if (success) {
        if (paymentState.status === 'confirmed') {
          // Payment confirmed on blockchain
          setStep('idle');
          onSuccess?.(
            paymentState.txHash || '',
            paymentState.blockNumber
          );
          resetPayment();
        } else if (paymentState.status === 'confirming') {
          // Transaction sent, waiting for confirmation
          // Poll for status
          setStep('checkingStatus');
          let attempts = 0;
          const maxAttempts = 120; // 2 minutes

          const pollingInterval = setInterval(async () => {
            attempts++;
            const status = await checkStatus(txId);

            if (status?.status === 'confirmed' || attempts >= maxAttempts) {
              clearInterval(pollingInterval);
              setStep('idle');
              onSuccess?.(
                status?.txHash || '',
                status?.blockNumber
              );
              resetPayment();
            }
          }, 1000);
        }
      }
    } catch (error: any) {
      setStep('idle');
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  };

  // Compute button state
  const buttonDisabled =
    disabled ||
    !userAddress ||
    !ethers.isAddress(userAddress) ||
    isLoading ||
    isSuccess;

  const buttonLabel = (() => {
    if (isSuccess) return '✅ Payment Confirmed';
    if (isError) return '❌ Payment Failed';
    if (step === 'confirming') return 'Opening MetaMask...';
    if (step === 'checkingStatus') return 'Confirming payment...';
    return label;
  })();

  // Compute button styles
  const baseStyles =
    'font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2';
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  const variantStyles = {
    primary:
      'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed',
    secondary:
      'bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed',
    outline:
      'border-2 border-rose-500 text-rose-500 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed',
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button
        onClick={handlePayment}
        disabled={buttonDisabled}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]}`}
      >
        {isLoading && (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {buttonLabel}
      </button>

      {/* Fee information */}
      {showFee && (
        <div className="text-xs text-gray-500 text-center">
          ~{ethers.formatEther(wireAmount)} WIRE + gas fee
        </div>
      )}

      {/* Status messages */}
      {paymentState.message && !isSuccess && !isError && (
        <div className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded">
          {paymentState.message}
        </div>
      )}

      {isSuccess && paymentState.explorerUrl && (
        <a
          href={paymentState.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-green-600 hover:underline"
        >
          View on WireScan →
        </a>
      )}

      {isError && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
          {paymentState.error}
        </div>
      )}
    </div>
  );
};

/**
 * PaymentModal - Full payment experience in a modal
 */
export const PaymentModal: React.FC<
  PaymentButtonProps & { isOpen: boolean; onClose: () => void }
> = ({ isOpen, onClose, ...props }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Confirm Payment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="text-sm text-gray-600 mb-1">Amount</div>
          <div className="text-2xl font-bold text-gray-900">
            {ethers.formatEther(props.wireAmount)} WIRE
          </div>
        </div>

        <PaymentButton
          {...props}
          className="w-full"
          onSuccess={(txHash) => {
            props.onSuccess?.(txHash);
            setTimeout(onClose, 2000);
          }}
          onError={(error) => {
            props.onError?.(error);
          }}
        />
      </div>
    </div>
  );
};

/**
 * DonationCard - Example component showing payment usage
 */
export const DonationCard: React.FC<{
  userAddress?: string;
  matchId?: string;
  onDonationComplete?: (txHash: string) => void;
}> = ({ userAddress, matchId, onDonationComplete }) => {
  const [donationAmount, setDonationAmount] = useState('0.35'); // WIRE

  const wireAmount = ethers.parseEther(donationAmount);

  return (
    <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-6 border border-rose-200">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Support This Match</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Donation Amount (WIRE)
          </label>
          <input
            type="number"
            value={donationAmount}
            onChange={(e) => setDonationAmount(e.target.value)}
            min="0.001"
            step="0.01"
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
          <p className="text-xs text-gray-500 mt-1">Minimum: 0.001 WIRE</p>
        </div>

        <PaymentButton
          userAddress={userAddress}
          wireAmount={wireAmount}
          purpose="donation"
          metadata={{ matchId }}
          onSuccess={(txHash) => {
            onDonationComplete?.(txHash);
          }}
          variant="primary"
          className="w-full"
        />
      </div>
    </div>
  );
};
