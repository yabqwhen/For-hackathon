// @ts-nocheck
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { ethers } from 'ethers';
import { useWallet } from '@/lib/hooks';
import Navbar from '@/components/Navbar';
import { PaymentButton } from '@/components/PaymentButton';
import { toast } from 'react-hot-toast';

/**
 * Academy data interface
 */
interface Academy {
  id: string;
  name: string;
  location: string;
  students: number;
  image: string;
  description: string;
  impactMetric: string;
}

/**
 * Kit type interface
 */
interface KitType {
  id: string;
  name: string;
  description: string;
  price: number;
  items: string[];
  icon: string;
}

/**
 * Donation receipt interface
 */
interface DonationReceipt {
  id: string;
  academyName: string;
  kitType: string;
  amount: number;
  date: string;
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
}

/**
 * Impact stats interface
 */
interface ImpactStat {
  label: string;
  value: number;
  unit: string;
  icon: string;
}

/**
 * Mock academies data
 */
const MOCK_ACADEMIES: Academy[] = [
  {
    id: '1',
    name: 'Lahore Cricket Academy',
    location: 'Lahore, Pakistan',
    students: 120,
    image: 'https://i.postimg.cc/L53p7WCg/psl-lahore-qalandars-(1).png',
    description: 'Training young cricket talents in Punjab',
    impactMetric: '120 children trained',
  },
  {
    id: '2',
    name: 'Karachi Street Cricket Initiative',
    location: 'Karachi, Pakistan',
    students: 85,
    image: 'https://i.postimg.cc/KjD2VWqf/psl-karachi-kings-(1).png',
    description: 'Grassroots cricket development program',
    impactMetric: '85 students engaged',
  },
  {
    id: '3',
    name: 'Islamabad Youth Sports Center',
    location: 'Islamabad, Pakistan',
    students: 95,
    image: 'https://i.postimg.cc/KcPxRKG8/psl-islamabad-united-(1).png',
    description: 'Comprehensive sports training hub',
    impactMetric: '95 active participants',
  },
  {
    id: '4',
    name: 'Multan Village Cricket Club',
    location: 'Multan, Pakistan',
    students: 60,
    image: 'https://i.postimg.cc/SRh4g4rR/psl-multan-sultan-(1).png',
    description: 'Bringing cricket to rural communities',
    impactMetric: '60 grassroots players',
  },
];

/**
 * Mock kit types
 */
const MOCK_KIT_TYPES: KitType[] = [
  {
    id: 'starter',
    name: 'Starter Kit',
    description: 'Perfect for beginners - includes essentials',
    price: 5000,
    items: ['Cricket Bat', 'Cricket Ball (Pack of 6)', 'Batting Gloves', 'Knee Pads'],
    icon: '🎾',
  },
  {
    id: 'pro',
    name: 'Pro Kit',
    description: 'For serious players - professional grade',
    price: 12000,
    items: ['Premium Cricket Bat', 'Professional Cricket Ball (Pack of 12)', 'Premium Batting Gloves', 'Full Protective Gear', 'Cricket Shoes'],
    icon: '⚡',
  },
  {
    id: 'team',
    name: 'Team Kit',
    description: 'Complete set for a full team',
    price: 35000,
    items: ['11 Cricket Bats', 'Team Jerseys (11 sets)', 'Protective Gear (Full Set)', 'Training Cones', 'Practice Nets'],
    icon: '🏆',
  },
];

/**
 * Step indicator component
 */
interface StepIndicatorProps {
  current: number;
  total: number;
  steps: string[];
}

/**
 * StepIndicator - Shows donation flow progress
 * @param current - Current step number (1-indexed)
 * @param total - Total number of steps
 * @param steps - Array of step labels
 */
function StepIndicator({ current, total, steps }: StepIndicatorProps): React.ReactElement {
  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-4">
        {Array.from({ length: total }).map((_, idx) => (
          <React.Fragment key={idx}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                idx + 1 <= current
                  ? 'bg-linear-to-r from-purple-600 to-rose-600 text-white'
                  : 'bg-white/10 text-gray-400'
              }`}
            >
              {idx + 1}
            </motion.div>
            {idx < total - 1 && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: idx + 1 <= current ? 1 : 0 }}
                className="flex-1 h-1 mx-2 rounded-full origin-left"
                style={{
                  background: idx + 1 <= current ? 'linear-gradient(90deg, rgb(168, 85, 247) to rgb(219, 39, 119))' : 'rgb(255, 255, 255, 0.1)',
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="flex justify-between text-xs">
        {steps.map((step, idx) => (
          <span key={idx} className={idx + 1 <= current ? 'text-white font-semibold' : 'text-gray-400'}>
            {step}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Academy selection card
 */
interface AcademyCardProps {
  academy: Academy;
  isSelected: boolean;
  onSelect: (academy: Academy) => void;
}

/**
 * AcademyCard - Selectable academy card
 * @param academy - Academy data
 * @param isSelected - Whether this academy is selected
 * @param onSelect - Callback when academy is selected
 */
function AcademyCard({ academy, isSelected, onSelect }: AcademyCardProps): React.ReactElement {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={() => onSelect(academy)}
      className={`relative p-4 rounded-xl cursor-pointer transition-all border-2 ${
        isSelected
          ? 'border-rose-500 bg-rose-500/10'
          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
      }`}
    >
      <div className="flex gap-4">
        <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
          <Image
            src={academy.image}
            alt={academy.name}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-1">{academy.name}</h3>
          <p className="text-xs text-gray-400 mb-2">{academy.location}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-rose-400">{academy.impactMetric}</span>
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-auto"
              >
                <svg className="w-5 h-5 text-rose-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Kit selection card
 */
interface KitCardProps {
  kit: KitType;
  isSelected: boolean;
  onSelect: (kit: KitType) => void;
}

/**
 * KitCard - Selectable kit type card
 * @param kit - Kit type data
 * @param isSelected - Whether this kit is selected
 * @param onSelect - Callback when kit is selected
 */
function KitCard({ kit, isSelected, onSelect }: KitCardProps): React.ReactElement {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(219, 39, 119, 0.3)' }}
      onClick={() => onSelect(kit)}
      className={`relative p-6 rounded-xl cursor-pointer transition-all border-2 ${
        isSelected
          ? 'border-rose-500 bg-rose-500/10'
          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
      }`}
    >
      <div className="mb-4">
        <div className="text-4xl mb-2">{kit.icon}</div>
        <h3 className="font-semibold text-white mb-1">{kit.name}</h3>
        <p className="text-xs text-gray-400 mb-3">{kit.description}</p>
      </div>

      <ul className="space-y-2 mb-4">
        {kit.items.map((item, idx) => (
          <li key={idx} className="text-xs text-gray-300 flex items-center gap-2">
            <span className="text-rose-400">•</span>
            {item}
          </li>
        ))}
      </ul>

      <div className={`p-4 rounded-lg mb-4 ${isSelected ? 'bg-rose-500/20' : 'bg-white/5'}`}>
        <p className="text-sm text-gray-400">Donation Amount</p>
        <p className="text-2xl font-bold text-rose-400">₨{kit.price.toLocaleString()}</p>
      </div>

      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-4 right-4"
        >
          <svg className="w-6 h-6 text-rose-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * Live impact tracker component
 */
interface LiveImpactProps {
  academyName: string;
  kitType: string;
  amount: number;
}

/**
 * LiveImpact - Shows real-time impact of donation
 * @param academyName - Selected academy name
 * @param kitType - Selected kit type name
 * @param amount - Donation amount
 */
function LiveImpact({ academyName, kitType, amount }: LiveImpactProps): React.ReactElement {
  const impacts: ImpactStat[] = [
    { label: 'Children Trained', value: Math.floor(amount / 2000), unit: 'kids', icon: '👶' },
    { label: 'Kits Provided', value: Math.floor(amount / 5000), unit: 'kits', icon: '🎾' },
    { label: 'Hours of Training', value: Math.floor(amount / 300), unit: 'hours', icon: '⏱️' },
    { label: 'Communities Reached', value: Math.floor(amount / 10000), unit: 'communities', icon: '🌍' },
  ];

  return (
    <div className="space-y-4">
      <div className="p-6 rounded-xl bg-linear-to-br from-purple-600/20 to-rose-600/20 border border-purple-500/30">
        <h4 className="text-sm text-gray-400 mb-4">Your Impact at {academyName}</h4>
        <div className="grid grid-cols-2 gap-4">
          {impacts.map((impact, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="p-3 rounded-lg bg-white/5 border border-white/10"
            >
              <div className="text-2xl mb-1">{impact.icon}</div>
              <div className="text-2xl font-bold text-rose-400">{impact.value}</div>
              <p className="text-xs text-gray-400">{impact.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Receipt component
 */
interface ReceiptProps {
  academyName: string;
  kitType: string;
  amount: number;
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
}

/**
 * Receipt - Donation confirmation receipt
 * @param academyName - Academy that received donation
 * @param kitType - Kit type donated
 * @param amount - Donation amount
 * @param txHash - Transaction hash
 * @param status - Transaction status
 */
function Receipt({ academyName, kitType, amount, txHash, status }: ReceiptProps): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-8 rounded-2xl bg-linear-to-br from-slate-900 to-slate-950 border border-white/10 max-w-lg mx-auto"
    >
      <div className="text-center mb-8">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.6 }}
          className="text-5xl mb-4"
        >
          {status === 'confirmed' ? '✅' : status === 'pending' ? '⏳' : '❌'}
        </motion.div>
        <h3 className="text-2xl font-bold text-white mb-2">
          {status === 'confirmed' ? 'Donation Confirmed!' : status === 'pending' ? 'Processing...' : 'Transaction Failed'}
        </h3>
        <p className="text-gray-400">
          {status === 'confirmed'
            ? 'Your donation has been successfully received'
            : status === 'pending'
            ? 'Your donation is being processed'
            : 'Unable to complete this transaction'}
        </p>
      </div>

      <div className="space-y-4 mb-8 pb-8 border-b border-white/10">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Academy</span>
          <span className="font-semibold text-white">{academyName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Kit Type</span>
          <span className="font-semibold text-white">{kitType}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Amount</span>
          <span className="font-semibold text-rose-400">₨{amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Date</span>
          <span className="font-semibold text-white">{new Date().toLocaleDateString()}</span>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs text-gray-400 mb-2">Transaction Hash</p>
        <div className="p-3 rounded-lg bg-white/5 border border-white/10 break-all">
          <code className="text-xs text-gray-300 font-mono">{txHash}</code>
        </div>
      </div>

      {status === 'confirmed' && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 rounded-lg bg-linear-to-r from-purple-600 to-rose-600 text-white font-semibold hover:shadow-lg hover:shadow-rose-500/50 transition-all"
        >
          Download Receipt
        </motion.button>
      )}
    </motion.div>
  );
}

/**
 * Impact Page - Donation flow and academy support
 */
export default function ImpactPage(): React.ReactElement {
  const { user, connect, isConnecting } = useWallet();
  const [step, setStep] = useState(1);
  const [selectedAcademy, setSelectedAcademy] = useState<Academy | null>(null);
  const [selectedKit, setSelectedKit] = useState<KitType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [receipt, setReceipt] = useState<DonationReceipt | null>(null);

  const steps = ['Select Academy', 'Choose Kit', 'Review & Donate', 'Confirmation'];

  /**
   * Handle academy selection
   */
  const handleAcademySelect = (academy: Academy): void => {
    setSelectedAcademy(academy);
  };

  /**
   * Handle kit selection
   */
  const handleKitSelect = (kit: KitType): void => {
    setSelectedKit(kit);
  };

  /**
   * Navigate to next step
   */
  const handleNext = (): void => {
    if (step === 1 && !selectedAcademy) {
      toast.error('Please select an academy');
      return;
    }
    if (step === 2 && !selectedKit) {
      toast.error('Please select a kit type');
      return;
    }
    if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      handleDonate();
    }
  };

  /**
   * Proceed to next step
   */
  const handleProceed = (): void => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  /**
   * Handle donation process via blockchain
   */
  const handleDonate = async (): Promise<void> => {
    if (!user?.isConnected || !user?.address) {
      toast.error('Please connect your wallet first');
      connect();
      return;
    }

    if (!selectedAcademy || !selectedKit) {
      toast.error('Please complete all selections');
      return;
    }

    // Conversion: 1 PKR ≈ 0.00006 WIRE
    const exchangeRate = 0.00006;
    const wireAmountNum = selectedKit.price * exchangeRate;
    const wireAmount = ethers.parseEther(wireAmountNum.toFixed(8));

    // Will be handled by PaymentButton component
    // This function shows the PaymentButton which will handle the actual payment
  };

  /**
   * Reset flow
   */
  const handleReset = (): void => {
    setStep(1);
    setSelectedAcademy(null);
    setSelectedKit(null);
    setReceipt(null);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black pt-20 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-center"
          >
            <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4">
              Make a <span className="bg-linear-to-r from-purple-400 to-rose-400 bg-clip-text text-transparent">Real Impact</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Support grassroots cricket development. Your donation provides equipment, training, and opportunities for young cricketers.
            </p>
          </motion.div>

          {/* Wallet Connection Banner */}
          {!user?.isConnected && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 sm:p-6 rounded-xl bg-linear-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 backdrop-blur-sm"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-amber-200 mb-1">Connect Your Wallet</h3>
                  <p className="text-sm text-amber-100/80">Connect to donate and support cricket academies</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={connect}
                  disabled={isConnecting}
                  className="px-6 py-2 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 disabled:opacity-50 transition-all whitespace-nowrap"
                >
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Main Content */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 sm:p-12">
            {/* Success State */}
            {step === 4 && receipt && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                <Receipt
                  academyName={receipt.academyName}
                  kitType={receipt.kitType}
                  amount={receipt.amount}
                  txHash={receipt.txHash}
                  status={receipt.status}
                />
                <div className="flex gap-4 justify-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleReset}
                    className="px-6 py-3 rounded-lg border border-white/20 text-white font-semibold hover:bg-white/10 transition-all"
                  >
                    Make Another Donation
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Donation Flow */}
            {step < 4 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={step}
              >
                <StepIndicator current={step} total={steps.length} steps={steps} />

                {/* Step 1: Select Academy */}
                {step === 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Select an Academy to Support</h3>
                      <p className="text-gray-400 mb-6">Choose the grassroots cricket academy you want to help</p>
                    </div>

                    <div className="space-y-4">
                      {MOCK_ACADEMIES.map((academy) => (
                        <AcademyCard
                          key={academy.id}
                          academy={academy}
                          isSelected={selectedAcademy?.id === academy.id}
                          onSelect={handleAcademySelect}
                        />
                      ))}
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleProceed}
                      disabled={!selectedAcademy}
                      className="w-full py-3 rounded-lg bg-linear-to-r from-purple-600 to-rose-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-rose-500/50 transition-all"
                    >
                      Continue to Kit Selection
                    </motion.button>
                  </motion.div>
                )}

                {/* Step 2: Choose Kit */}
                {step === 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Choose a Kit Type for {selectedAcademy?.name}</h3>
                      <p className="text-gray-400 mb-6">Select the equipment package that best supports your chosen academy</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {MOCK_KIT_TYPES.map((kit) => (
                        <KitCard
                          key={kit.id}
                          kit={kit}
                          isSelected={selectedKit?.id === kit.id}
                          onSelect={handleKitSelect}
                        />
                      ))}
                    </div>

                    <div className="flex gap-4">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setStep(1)}
                        className="flex-1 py-3 rounded-lg border border-white/20 text-white font-semibold hover:bg-white/10 transition-all"
                      >
                        Back
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleProceed}
                        disabled={!selectedKit}
                        className="flex-1 py-3 rounded-lg bg-linear-to-r from-purple-600 to-rose-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-rose-500/50 transition-all"
                      >
                        Review Donation
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Review & Donate */}
                {step === 3 && selectedAcademy && selectedKit && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Review Your Donation</h3>
                      <p className="text-gray-400 mb-6">Confirm the details and proceed with your gift</p>
                    </div>

                    <div className="p-6 rounded-xl bg-white/5 border border-white/10 space-y-4 mb-6">
                      <div className="flex justify-between items-center pb-4 border-b border-white/10">
                        <span className="text-gray-400">Academy</span>
                        <span className="font-semibold text-white">{selectedAcademy.name}</span>
                      </div>
                      <div className="flex justify-between items-center pb-4 border-b border-white/10">
                        <span className="text-gray-400">Kit Type</span>
                        <span className="font-semibold text-white">{selectedKit.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Total Donation</span>
                        <span className="text-2xl font-bold text-rose-400">₨{selectedKit.price.toLocaleString()}</span>
                      </div>
                    </div>

                    <LiveImpact
                      academyName={selectedAcademy.name}
                      kitType={selectedKit.name}
                      amount={selectedKit.price}
                    />

                    <div className="flex gap-4">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setStep(2)}
                        className="flex-1 py-3 rounded-lg border border-white/20 text-white font-semibold hover:bg-white/10 transition-all"
                      >
                        Back
                      </motion.button>
                      {selectedAcademy && selectedKit && user?.address && (
                        <PaymentButton
                          userAddress={user.address}
                          wireAmount={ethers.parseEther((selectedKit.price * 0.00006).toFixed(8))}
                          purpose="donation"
                          label="Confirm & Donate"
                          size="md"
                          metadata={{
                            academyId: selectedAcademy.id,
                            academyName: selectedAcademy.name,
                            kitType: selectedKit.id,
                          }}
                          onSuccess={() => {
                            // Just show thank you - no receipt needed for donations
                            setReceipt({
                              id: `IMPACT-${Date.now()}`,
                              academyName: selectedAcademy.name,
                              kitType: selectedKit.name,
                              amount: selectedKit.price,
                              date: new Date().toISOString(),
                              txHash: 'pending',
                              status: 'confirmed',
                            });
                            setStep(4);
                            toast.success('🎉 Thank you for your donation!');
                          }}
                          onError={(error) => {
                            toast.error(`Donation failed: ${error.message}`);
                          }}
                        />
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}