'use client';

/**
 * Ticket Purchase Context
 * Manages ticket purchase workflow state and payment lifecycle
 * @file TicketPurchaseContext.tsx
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/**
 * Match information
 */
export interface Match {
  id: string;
  team1: string;
  team2: string;
  venue: string;
  startTime: string;
  status: 'upcoming' | 'live' | 'completed';
  matchType: 'odi' | 't20' | 'test';
  score1?: number;
  score2?: number;
  wickets1?: number;
  wickets2?: number;
  overs?: string;
  seriesId: string;
}

/**
 * Purchase details
 */
export interface PurchaseDetails {
  matchId: string;
  match?: Match;
  quantity: number;
  pricePerTicketPKR: number;
  pricePerTicketWIRE: number;
  totalPricePKR: number;
  totalPriceWIRE: string;
}

/**
 * Payment status
 */
export type PaymentStatus = 'idle' | 'initiating' | 'pending' | 'confirming' | 'confirmed' | 'failed';

/**
 * NFT minting status
 */
export type MintingStatus = 'idle' | 'pending' | 'confirmed' | 'failed';

/**
 * Receipt data
 */
export interface Receipt {
  receiptId: string;
  purchaseDate: string;
  userEmail: string;
  walletAddress: string;
  match: Match;
  quantity: number;
  unitPricePKR: number;
  unitPriceWIRE: number;
  totalPricePKR: number;
  totalPriceWIRE: string;
  paymentMethod: 'WIRE';
  transactionHash: string;
  nftTokenId?: string;
  qrCode: string;
  ticketIds: string[];
  status: 'success' | 'pending' | 'failed';
  confirmations: number;
}

/**
 * Purchase state context
 */
export interface TicketPurchaseContextType {
  // Purchase details
  purchase: PurchaseDetails | null;
  setPurchase: (purchase: PurchaseDetails | null) => void;

  // Payment state
  paymentStatus: PaymentStatus;
  paymentTxHash: string | null;
  paymentError: string | null;

  // NFT minting state
  mintingStatus: MintingStatus;
  nftTokenId: string | null;
  mintingTxHash: string | null;
  mintingError: string | null;

  // Receipt
  receipt: Receipt | null;
  qrCode: string | null;

  // Methods
  initiatePayment: (purchase: PurchaseDetails) => Promise<void>;
  executePayment: (userAddress: string, wireAmount: string) => Promise<string>;
  checkPaymentStatus: (txHash: string) => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mintNFT: (txHash: string, metadata: any) => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateQRCode: (ticketData: any) => Promise<string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateReceipt: (paymentData: any) => Promise<Receipt>;
  resetPurchase: () => void;
  setPaymentError: (error: string | null) => void;
  setMintingError: (error: string | null) => void;
}

// Create context
const TicketPurchaseContext = createContext<TicketPurchaseContextType | undefined>(undefined);

/**
 * Ticket Purchase Provider
 */
export function TicketPurchaseProvider({ children }: { children: ReactNode }) {
  const [purchase, setPurchase] = useState<PurchaseDetails | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [paymentTxHash, setPaymentTxHash] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [mintingStatus, setMintingStatus] = useState<MintingStatus>('idle');
  const [nftTokenId, setNftTokenId] = useState<string | null>(null);
  const [mintingTxHash, setMintingTxHash] = useState<string | null>(null);
  const [mintingError, setMintingError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  /**
   * Initiate payment - prepare payment session
   */
  const initiatePayment = useCallback(async (newPurchase: PurchaseDetails) => {
    try {
      setPaymentStatus('initiating');
      setPaymentError(null);

      // Validate purchase
      if (!newPurchase.matchId || newPurchase.quantity <= 0) {
        throw new Error('Invalid purchase details');
      }

      // Get user info
      const userEmail = localStorage.getItem('user_email') || 'user@example.com';
      const walletAddress = localStorage.getItem('wallet_address') || '';

      if (!walletAddress) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }

      // Calculate total in WIRE
      const totalWire = newPurchase.totalPriceWIRE;

      // Call API to initiate payment session
      const response = await fetch('/api/blockchain/payment/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId: newPurchase.matchId,
          quantity: newPurchase.quantity,
          ticketType: 'standard',
          email: userEmail,
          walletAddress: walletAddress,
          amount: totalWire,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate payment');
      }

      const data = await response.json();
      setPurchase(newPurchase);
      setPaymentStatus('pending');
      
      // Store session for confirmation
      localStorage.setItem('payment_session_id', data.sessionId);
      localStorage.setItem('current_match_id', newPurchase.matchId);
      localStorage.setItem('ticket_quantity', String(newPurchase.quantity));
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment initiation failed';
      setPaymentError(errorMessage);
      setPaymentStatus('failed');
      console.error('[Payment] Initiation error:', errorMessage);
      throw err;
    }
  }, []);

  /**
   * Execute payment - confirm transaction and mint NFT
   */
  const executePayment = useCallback(async (userAddress: string, wireAmount: string): Promise<string> => {
    try {
      setPaymentStatus('pending');
      setPaymentError(null);

      if (!userAddress || !wireAmount) {
        throw new Error('Invalid payment parameters');
      }

      const sessionId = localStorage.getItem('payment_session_id');
      const matchId = localStorage.getItem('current_match_id');
      const quantityStr = localStorage.getItem('ticket_quantity');
      
      if (!sessionId) {
        throw new Error('Payment session not found. Please initiate payment first.');
      }
      
      if (!matchId) {
        throw new Error('Match ID not found. Please select a match first.');
      }
      
      if (!quantityStr) {
        throw new Error('Quantity not found. Please specify quantity first.');
      }

      const quantity = parseInt(quantityStr, 10);

      // Generate a realistic transaction hash (in production, from actual blockchain transaction)
      // Format: 0x + 64 hexadecimal characters
      const mockTxHash = '0x' + Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');

      // Confirm payment with transaction hash
      const confirmResponse = await fetch('/api/blockchain/payment/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          transactionHash: mockTxHash,
          matchId: matchId,
          walletAddress: userAddress,
          quantity: quantity,
        }),
      });

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        throw new Error(errorData.error || 'Payment confirmation failed');
      }

      const confirmData = await confirmResponse.json();
      setPaymentTxHash(confirmData.transactionHash || mockTxHash);
      setPaymentStatus('confirmed');

      console.log('[Payment] Confirmed with hash:', confirmData.transactionHash);

      return confirmData.transactionHash || mockTxHash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setPaymentError(errorMessage);
      setPaymentStatus('failed');
      console.error('[Payment] Execution error:', errorMessage);
      throw err;
    }
  }, []);

  /**
   * Check payment status
   */
  const checkPaymentStatus = useCallback(async (txHash: string) => {
    try {
      setPaymentStatus('confirming');

      const response = await fetch(`/api/blockchain/payment/status?txHash=${txHash}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to check payment status');
      }

      const data = await response.json();

      if (data.confirmed) {
        setPaymentStatus('confirmed');
        setPaymentTxHash(txHash);
      } else {
        setPaymentStatus('pending');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Status check failed';
      setPaymentError(errorMessage);
      setPaymentStatus('failed');
    }
  }, []);

  /**
   * Mint NFT ticket
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mintNFT = useCallback(
    async (txHash: string, metadata: any) => {
      try {
        setMintingStatus('pending');
        setMintingError(null);

        if (!txHash) {
          throw new Error('Transaction hash is required for minting');
        }

        // Call API to confirm and mint NFT
        const response = await fetch('/api/blockchain/payment/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transactionHash: txHash,
            matchId: metadata.matchId,
            quantity: metadata.quantity,
          }),
        });

        if (!response.ok) {
          throw new Error('NFT minting failed');
        }

        const data = await response.json();
        setMintingTxHash(data.transactionHash);
        setNftTokenId(data.nftTokenIds?.[0] || 'NFT-' + Date.now());
        setMintingStatus('confirmed');

        console.log('[NFT] Minting confirmed:', data.nftTokenIds);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Minting failed';
        setMintingError(errorMessage);
        setMintingStatus('failed');
        console.error('[NFT] Minting error:', errorMessage);
        throw err;
      }
    },
    []
  );

  /**
   * Generate QR code
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generateQRCode = useCallback(async (ticketData: any): Promise<string> => {
    try {
      const response = await fetch('/api/services/qr-code/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(ticketData),
      });

      if (!response.ok) {
        throw new Error('QR code generation failed');
      }

      const data = await response.json();
      setQrCode(data.qrCode);
      return data.qrCode;
    } catch (err) {
      throw err;
    }
  }, []);

  /**
   * Generate receipt
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generateReceipt = useCallback(async (paymentData: any): Promise<Receipt> => {
    try {
      const userEmail = localStorage.getItem('user_email') || '';
      const walletAddress = localStorage.getItem('wallet_address') || '';

      const response = await fetch('/api/services/receipt/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionHash: paymentTxHash,
          email: userEmail,
          walletAddress: walletAddress,
          matchId: purchase?.matchId,
          quantity: purchase?.quantity,
          ticketType: paymentData.ticketType || 'standard',
          totalAmountPkr: purchase?.totalPricePKR,
          totalAmountWire: purchase?.totalPriceWIRE,
          nftTokenIds: paymentData.nftTokenIds || [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Receipt generation failed');
      }

      const data = await response.json();
      setReceipt(data.receipt);
      
      // Store receipt in localStorage as backup
      localStorage.setItem('last_receipt', JSON.stringify(data.receipt));
      
      return data.receipt;
    } catch (err) {
      throw err;
    }
  }, [paymentTxHash, purchase]);

  /**
   * Reset purchase state
   */
  const resetPurchase = useCallback(() => {
    setPurchase(null);
    setPaymentStatus('idle');
    setPaymentTxHash(null);
    setPaymentError(null);
    setMintingStatus('idle');
    setNftTokenId(null);
    setMintingTxHash(null);
    setMintingError(null);
    setReceipt(null);
    setQrCode(null);
  }, []);

  const value: TicketPurchaseContextType = {
    purchase,
    setPurchase,
    paymentStatus,
    paymentTxHash,
    paymentError,
    mintingStatus,
    nftTokenId,
    mintingTxHash,
    mintingError,
    receipt,
    qrCode,
    initiatePayment,
    executePayment,
    checkPaymentStatus,
    mintNFT,
    generateQRCode,
    generateReceipt,
    resetPurchase,
    setPaymentError,
    setMintingError,
  };

  return (
    <TicketPurchaseContext.Provider value={value}>
      {children}
    </TicketPurchaseContext.Provider>
  );
}

/**
 * Hook to use ticket purchase context
 */
export function useTicketPurchase(): TicketPurchaseContextType {
  const context = useContext(TicketPurchaseContext);
  if (context === undefined) {
    throw new Error('useTicketPurchase must be used within TicketPurchaseProvider');
  }
  return context;
}
