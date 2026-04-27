"use client";

import { useState } from"react";
import { motion, AnimatePresence } from"framer-motion";
import {
 CheckCircle,
 XCircle,
 Lightbulb,
 Trophy,
 Shuffle
} from"lucide-react";

interface QuizQuestion {
 id: string;
 type: 'fill-blank' | 'multiple-choice' | 'flashcard';
 category: string;
 question: string;
 answer: string;
 options?: string[];
 explanation: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
 {
 id:"1",
 type:"fill-blank",
 category:"Changement climatique",
 question:"Le réchauffement climatique actuel est principalement causé par les émissions de ______ de serre.",
 answer:"gaz",
 explanation:"Les gaz à effet de serre comme le CO2 piègent la chaleur dans l'atmosphère."
 },
 {
 id:"2",
 type:"multiple-choice",
 category:"Limites planétaires",
 question:"Quelle limite planétaire est déjà dépassée selon les scientifiques ?",
 answer:"Le changement climatique",
 options: ["La biodiversité","Le changement climatique","Le cycle de l'azote","L'acidification des océans"],
 explanation:"Le changement climatique est la limite la plus dépassée avec un réchauffement de +1,1°C."
 },
 {
 id:"3",
 type:"flashcard",
 category:"ODD",
 question:"L'ODD 13 concerne la lutte contre le changement climatique. Vrai ou faux ?",
 answer:"Vrai",
 explanation:"L'ODD 13 vise à prendre des mesures urgentes pour lutter contre le changement climatique."
 },
 {
 id:"4",
 type:"fill-blank",
 category:"GIEC",
 question:"Le GIEC recommande de limiter le réchauffement à ______ degrés maximum.",
 answer:"1,5",
 explanation:"Le GIEC recommande de limiter le réchauffement à 1,5°C pour éviter les pires impacts."
 },
 {
 id:"5",
 type:"multiple-choice",
 category:"Pollution plastique",
 question:"Quel pourcentage des déchets plastiques finissent dans les océans ?",
 answer:"80%",
 options: ["20%","50%","80%","95%"],
 explanation:"Environ 80% des déchets plastiques rejetés dans l'environnement finissent dans les océans."
 }
];

export function EnvironmentalQuiz() {
 const [shuffledQuestions] = useState(() => [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5));
 const [currentQuestion, setCurrentQuestion] = useState(0);
 const [userAnswer, setUserAnswer] = useState("");
 const [selectedOption, setSelectedOption] = useState("");
 const [showAnswer, setShowAnswer] = useState(false);
 const [score, setScore] = useState(0);
 const [completedQuestions, setCompletedQuestions] = useState<Set<number>>(new Set());

 const question = shuffledQuestions[currentQuestion];

 const checkAnswer = () => {
 const isCorrect =
 question.type === 'fill-blank'
 ? userAnswer.toLowerCase().trim() === question.answer.toLowerCase().trim()
 : selectedOption === question.answer;

 if (isCorrect && !completedQuestions.has(currentQuestion)) {
 setScore(prev => prev + 1);
 setCompletedQuestions(prev => new Set([...prev, currentQuestion]));
 }

 setShowAnswer(true);
 };

 const nextQuestion = () => {
 if (currentQuestion < shuffledQuestions.length - 1) {
 setCurrentQuestion(prev => prev + 1);
 setUserAnswer("");
 setSelectedOption("");
 setShowAnswer(false);
 }
 };

 const resetQuiz = () => {
 setCurrentQuestion(0);
 setUserAnswer("");
 setSelectedOption("");
 setShowAnswer(false);
 setScore(0);
 setCompletedQuestions(new Set());
 };

 return (
 <div className="space-y-8">
 {/* Header */}
 <div className="text-center space-y-4">
 <div className="flex items-center justify-center gap-3">
 <Lightbulb className="text-emerald-600" size={32} />
 <h2 className="text-3xl font-bold cmm-text-primary">Quiz Environnemental</h2>
 </div>
 <p className="text-lg cmm-text-secondary max-w-2xl mx-auto">
 Testez vos connaissances sur le changement climatique, les limites planétaires et les objectifs mondiaux.
 </p>
 </div>

 {/* Progress Bar */}
 <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
 <motion.div
 className="bg-emerald-500 h-2 rounded-full"
 initial={{ width: 0 }}
 animate={{ width: `${((currentQuestion + 1) / shuffledQuestions.length) * 100}%` }}
 transition={{ duration: 0.3 }}
 />
 </div>

 {/* Question Card */}
 <AnimatePresence mode="wait">
 <motion.div
 key={currentQuestion}
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-slate-200 shadow-xl"
 >
 {/* Question Type & Category */}
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-2">
 <span className={`px-3 py-1 rounded-full cmm-text-caption font-bold uppercase tracking-wider ${
 question.type === 'fill-blank' ? 'bg-blue-100 text-blue-700' :
 question.type === 'multiple-choice' ? 'bg-purple-100 text-purple-700' :
 'bg-emerald-100 text-emerald-700'
 }`}>
 {question.type === 'fill-blank' ? 'Phrase à trous' :
 question.type === 'multiple-choice' ? 'QCM' : 'Flashcard'}
 </span>
 <span className="cmm-text-caption cmm-text-muted font-medium">
 {question.category}
 </span>
 </div>
 <span className="cmm-text-small cmm-text-muted">
 {currentQuestion + 1}/{shuffledQuestions.length}
 </span>
 </div>

 {/* Question */}
 <h3 className="text-xl font-bold cmm-text-primary mb-6 leading-relaxed">
 {question.question}
 </h3>

 {/* Answer Input */}
 {question.type === 'fill-blank' && (
 <input
 type="text"
 value={userAnswer}
 onChange={(e) => setUserAnswer(e.target.value)}
 placeholder="Votre réponse..."
 className="w-full p-4 border border-slate-300 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors"
 disabled={showAnswer}
 />
 )}

 {question.type === 'multiple-choice' && question.options && (
 <div className="space-y-3">
 {question.options.map((option, index) => (
 <button
 key={index}
 onClick={() => !showAnswer && setSelectedOption(option)}
 className={`w-full p-4 text-left rounded-xl border transition-all ${
 selectedOption === option
 ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
 : 'border-slate-200 hover:border-slate-300 bg-white'
 } ${showAnswer ? 'cursor-not-allowed opacity-60' : ''}`}
 disabled={showAnswer}
 >
 {option}
 </button>
 ))}
 </div>
 )}

 {question.type === 'flashcard' && (
 <div className="text-center">
 <button
 onClick={() => setShowAnswer(true)}
 className="px-8 py-4 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors"
 >
 Révéler la réponse
 </button>
 </div>
 )}

 {/* Check Answer Button */}
 {((question.type === 'fill-blank' && userAnswer.trim()) ||
 (question.type === 'multiple-choice' && selectedOption)) && !showAnswer && (
 <button
 onClick={checkAnswer}
 className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors mt-4"
 >
 Vérifier ma réponse
 </button>
 )}

 {/* Answer Reveal */}
 {showAnswer && (
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="space-y-4 mt-6"
 >
 {/* Result */}
 <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50">
 {question.type === 'flashcard' ? (
 <Lightbulb className="text-emerald-500" size={24} />
 ) : (
 <>
 {((question.type === 'fill-blank' && userAnswer.toLowerCase().trim() === question.answer.toLowerCase().trim()) ||
 (question.type === 'multiple-choice' && selectedOption === question.answer)) ? (
 <CheckCircle className="text-green-500" size={24} />
 ) : (
 <XCircle className="text-red-500" size={24} />
 )}
 </>
 )}
 <div>
 <p className="font-bold cmm-text-primary">
 {question.type === 'flashcard' ? 'Réponse' : 'Votre réponse'} :
 </p>
 <p className="cmm-text-secondary">
 {question.type === 'fill-blank' ? userAnswer :
 question.type === 'multiple-choice' ? selectedOption :
 question.answer}
 </p>
 {question.type !== 'flashcard' && (
 <p className="cmm-text-small text-emerald-600 font-medium mt-1">
 Réponse correcte : {question.answer}
 </p>
 )}
 </div>
 </div>

 {/* Explanation */}
 <div className="p-4 bg-blue-50 rounded-xl">
 <p className="text-blue-800">{question.explanation}</p>
 </div>

 {/* Navigation */}
 <div className="flex gap-3">
 {currentQuestion < shuffledQuestions.length - 1 ? (
 <button
 onClick={nextQuestion}
 className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors"
 >
 Question suivante
 </button>
 ) : (
 <button
 onClick={resetQuiz}
 className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors"
 >
 Recommencer le quiz
 </button>
 )}
 <button
 onClick={resetQuiz}
 className="px-4 py-3 border-2 border-slate-200 cmm-text-secondary rounded-xl font-bold hover:bg-slate-50 transition-colors"
 >
 <Shuffle size={20} />
 </button>
 </div>
 </motion.div>
 )}
 </motion.div>
 </AnimatePresence>

 {/* Score Summary */}
 {completedQuestions.size > 0 && (
 <motion.div
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 className="bg-gradient-to-r from-emerald-500 to-blue-500 rounded-3xl p-6 text-white text-center"
 >
 <Trophy size={48} className="mx-auto mb-4" />
 <h3 className="text-2xl font-bold mb-2">Votre score</h3>
 <p className="text-lg">
 {score} bonnes réponses sur {QUIZ_QUESTIONS.length} questions
 </p>
 <p className="cmm-text-small opacity-90 mt-2">
 {Math.round((score / QUIZ_QUESTIONS.length) * 100)}% de réussite
 </p>
 </motion.div>
 )}
 </div>
 );
}