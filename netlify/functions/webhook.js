const { createClient } = require('@supabase/supabase-js');

// Conexão com o Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://iazehdwsnmunglhdtize.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método não permitido' };
    }

    try {
        const body = JSON.parse(event.body);

        // 🔴 ISSO VAI IMPRIMIR A MENSAGEM DA KIWIFY NA SUA TELA PRETA
        console.log("=== CHEGOU UMA NOVA VENDA ===");
        console.log("Status da ordem:", body.order_status);
        console.log("Email do cliente:", body.Customer?.email || body.customer?.email);

        if (body.order_status === 'paid') {
            const emailCliente = body.Customer?.email || body.customer?.email;
            
            // Vamos caçar o nome do plano em TODOS os lugares possíveis que a Kiwify usa
            const nome1 = body.Product?.product_name || '';
            const nome2 = body.product?.name || '';
            const nome3 = body.Subscription?.plan?.name || '';
            const nome4 = body.subscription?.plan?.name || '';

            // Junta tudo numa frase só, tudo em minúsculo, para não ter como escapar
            const nomeVerificacao = `${nome1} ${nome2} ${nome3} ${nome4}`.toLowerCase();
            
            console.log("Palavras encontradas pela IA:", nomeVerificacao);

            let planoComprado = 'basico'; // Padrão de segurança
            
            // Verifica qual palavra-chave está dentro da frase
            if (nomeVerificacao.includes('premium')) {
                planoComprado = 'premium';
            } else if (nomeVerificacao.includes('pro')) {
                planoComprado = 'pro';
            }

            console.log(`➡️ PLANO DEFINIDO: ${planoComprado}`);

            const { data: perfilExistente } = await supabase
                .from('perfis')
                .select('*')
                .eq('email', emailCliente)
                .single();

            if (perfilExistente) {
                await supabase.from('perfis').update({ plano: planoComprado }).eq('email', emailCliente);
                console.log("Conta atualizada com sucesso!");
            } else {
                await supabase.from('perfis').insert([{ email: emailCliente, plano: planoComprado }]);
                console.log("Conta criada com sucesso!");
            }
        }

        return { statusCode: 200, body: JSON.stringify({ message: 'OK' }) };
    } catch (error) {
        console.error('Erro no webhook:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Erro' }) };
    }
};
