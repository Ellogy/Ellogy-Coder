// Script de test pour vérifier la sauvegarde d'un chat unique
// À exécuter dans la console du navigateur

async function testSingleChatSave() {
  console.log('🧪 Test de sauvegarde d\'un chat unique...');

  try {
    // Import du client Supabase
    const { supabaseChatClient } = await import('./app/lib/persistence/supabaseClient.ts');

    // Test 1: Récupérer tous les chats
    console.log('\n📋 Test 1: Récupération de tous les chats');
    const allChats = await supabaseChatClient.getAll();
    console.log(`✅ Nombre de chats trouvés: ${allChats.length}`);

    if (allChats.length === 0) {
      console.log('❌ Aucun chat trouvé dans Supabase');
      return;
    }

    // Test 2: Vérifier le chat le plus récent
    console.log('\n📋 Test 2: Vérification du chat le plus récent');
    const latestChat = allChats[0]; // Le premier est le plus récent
    console.log('✅ Chat le plus récent:', {
      id: latestChat.id,
      description: latestChat.description,
      messagesCount: latestChat.messages?.length || 0,
      timestamp: latestChat.timestamp
    });

    // Test 3: Récupérer le snapshot
    console.log('\n📋 Test 3: Vérification du snapshot');
    const snapshot = await supabaseChatClient.getSnapshot(latestChat.id);
    if (snapshot) {
      console.log('✅ Snapshot trouvé:', {
        chatIndex: snapshot.chatIndex,
        filesCount: Object.keys(snapshot.files || {}).length,
        summary: snapshot.summary
      });
    } else {
      console.log('⚠️ Aucun snapshot trouvé pour ce chat');
    }

    // Test 4: Vérifier les données complètes
    console.log('\n📋 Test 4: Vérification des données complètes');
    const chatDetails = await supabaseChatClient.getChatById(latestChat.id);
    console.log('✅ Détails du chat:', {
      id: chatDetails.id,
      urlId: chatDetails.urlId,
      description: chatDetails.description,
      messagesCount: chatDetails.messages?.length || 0,
      hasMetadata: !!chatDetails.metadata
    });

    // Résumé
    console.log('\n🎯 Résumé du test:');
    console.log(`✅ Chats sauvegardés: ${allChats.length}`);
    console.log(`✅ Snapshot associé: ${snapshot ? 'Oui' : 'Non'}`);
    console.log(`✅ Messages: ${chatDetails.messages?.length || 0}`);
    console.log(`✅ Fichiers: ${snapshot ? Object.keys(snapshot.files || {}).length : 0}`);

    if (allChats.length === 1 && snapshot) {
      console.log('\n🎉 SUCCÈS: Un chat unique avec son snapshot a été sauvegardé correctement !');
    } else if (allChats.length > 1) {
      console.log('\n⚠️ ATTENTION: Plus d\'un chat trouvé. Vérifiez les timestamps.');
    } else {
      console.log('\n❌ ÉCHEC: Chat ou snapshot manquant.');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    console.log('\n🔧 Solutions possibles:');
    console.log('1. Vérifiez que Supabase est connecté');
    console.log('2. Vérifiez les variables d\'environnement');
    console.log('3. Vérifiez que le chat a été sauvegardé');
  }
}

// Exécuter le test
testSingleChatSave();
