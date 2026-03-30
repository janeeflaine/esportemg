'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import Link from 'next/link';

export default function RecuperarSenha() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (err: any) {
      setError('Erro ao enviar e-mail. Verifique se o endereço está correto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Recuperar Senha
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Digite seu e-mail para receber um link de redefinição de senha.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleReset}>
          {error && <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</div>}
          {message && <div className="text-green-600 text-sm text-center bg-green-50 p-2 rounded">{message}</div>}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {loading ? 'Enviando...' : 'Enviar Link'}
            </button>
          </div>
        </form>
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Lembrou a senha?{' '}
            <Link href="/login" className="font-medium text-green-600 hover:text-green-500">
              Voltar ao login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
