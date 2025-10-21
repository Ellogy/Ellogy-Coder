import { useState, useEffect } from 'react';
import { supabaseConnection } from '~/lib/stores/supabase';
import { useStore } from '@nanostores/react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { Dialog, DialogClose, DialogTitle } from '~/components/ui/Dialog';

interface DiagnosticResult {
  connectionStatus: boolean;
  credentialsAvailable: boolean;
  localStorageData: any;
  supabaseUrl: string;
  anonKey: string;
  errors: string[];
}

export function SupabaseDiagnostic({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const connection = useStore(supabaseConnection);

  const runDiagnostic = async () => {
    setIsRunning(true);

    const errors: string[] = [];

    try {
      // Vérifier la connexion
      const connectionStatus = connection.isConnected;

      // Vérifier les credentials
      const credentialsAvailable = !!(connection.credentials?.anonKey && connection.credentials?.supabaseUrl);

      // Vérifier localStorage
      const localStorageData = {
        connection: localStorage.getItem('supabase_connection'),
        credentials: localStorage.getItem('supabaseCredentials'),
      };

      // Vérifier les credentials spécifiques
      const supabaseUrl = connection.credentials?.supabaseUrl || 'Non défini';
      const anonKey = connection.credentials?.anonKey
        ? `${connection.credentials.anonKey.substring(0, 20)}...`
        : 'Non défini';

      // Vérifications d'erreur
      if (!connectionStatus) {
        errors.push('Connexion Supabase non établie');
      }

      if (!credentialsAvailable) {
        errors.push('Credentials Supabase manquants');
      }

      if (!connection.credentials?.supabaseUrl) {
        errors.push('URL Supabase manquante');
      }

      if (!connection.credentials?.anonKey) {
        errors.push('Clé API Supabase manquante');
      }

      if (!localStorageData.connection) {
        errors.push('Aucune donnée de connexion dans localStorage');
      }

      setDiagnostic({
        connectionStatus: !!connectionStatus,
        credentialsAvailable,
        localStorageData,
        supabaseUrl,
        anonKey,
        errors,
      });
    } catch (error) {
      errors.push(`Erreur lors du diagnostic: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setDiagnostic({
        connectionStatus: false,
        credentialsAvailable: false,
        localStorageData: null,
        supabaseUrl: 'Erreur',
        anonKey: 'Erreur',
        errors,
      });
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostic();
    }
  }, [isOpen]);

  return (
    <RadixDialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog showCloseButton={false}>
        <div className="p-6 bg-white dark:bg-gray-950 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-xl font-semibold">Diagnostic Supabase</DialogTitle>
            <DialogClose onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </DialogClose>
          </div>

          <div className="space-y-4">
            {isRunning ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2">Exécution du diagnostic...</p>
              </div>
            ) : diagnostic ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={`p-3 rounded-lg ${diagnostic.connectionStatus ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
                  >
                    <h3 className="font-medium text-sm">Statut de Connexion</h3>
                    <p className={`text-sm ${diagnostic.connectionStatus ? 'text-green-800' : 'text-red-800'}`}>
                      {diagnostic.connectionStatus ? '✅ Connecté' : '❌ Non connecté'}
                    </p>
                  </div>

                  <div
                    className={`p-3 rounded-lg ${diagnostic.credentialsAvailable ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
                  >
                    <h3 className="font-medium text-sm">Credentials</h3>
                    <p className={`text-sm ${diagnostic.credentialsAvailable ? 'text-green-800' : 'text-red-800'}`}>
                      {diagnostic.credentialsAvailable ? '✅ Disponibles' : '❌ Manquants'}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-sm mb-2">Détails de Configuration</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>URL Supabase:</strong> {diagnostic.supabaseUrl}
                    </p>
                    <p>
                      <strong>Clé API:</strong> {diagnostic.anonKey}
                    </p>
                  </div>
                </div>

                {diagnostic.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-medium text-red-900 mb-2">Erreurs Détectées</h3>
                    <ul className="text-sm text-red-800 space-y-1">
                      {diagnostic.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {diagnostic.errors.length === 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-medium text-green-900 mb-2">✅ Configuration OK</h3>
                    <p className="text-sm text-green-800">
                      Supabase est correctement configuré et devrait fonctionner.
                    </p>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Solutions Recommandées</h3>
                  <div className="text-sm text-blue-800 space-y-2">
                    {diagnostic.errors.some((e) => e.includes('Connexion Supabase non établie')) && (
                      <p>• Cliquez sur l'icône Supabase et connectez-vous</p>
                    )}
                    {diagnostic.errors.some((e) => e.includes('Credentials')) && (
                      <p>• Vérifiez que vous avez sélectionné un projet Supabase</p>
                    )}
                    {diagnostic.errors.some((e) => e.includes('Clé API')) && (
                      <p>• Obtenez votre clé API depuis votre projet Supabase</p>
                    )}
                    <p>• Redémarrez l'application après configuration</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex space-x-3">
              <button
                onClick={runDiagnostic}
                disabled={isRunning}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isRunning ? 'Diagnostic...' : 'Relancer Diagnostic'}
              </button>
              <button onClick={onClose} className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400">
                Fermer
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    </RadixDialog.Root>
  );
}
