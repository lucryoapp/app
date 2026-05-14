exports.handler = async (event) => {
    // Aceita apenas requisições POST da Kiwify
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Apenas POST' };

    try {
        const body = JSON.parse(event.body);
        
        // Verifica se o pagamento foi aprovado
        if (body.order_status !== 'paid') {
            return { statusCode: 200, body: 'Ignorado: não é pagamento aprovado' };
        }

        const emailComprador = body.Customer.email;
        let planoComprado = 'basico'; // Padrão

        // Busca o NOME do plano ou do produto vendido
        let nomeDoPlano = '';
        if (body.Subscription && body.Subscription.plan && body.Subscription.plan.name) {
            // Se for uma assinatura, pega o nome do plano (ex: "Pro", "Premium")
            nomeDoPlano = body.Subscription.plan.name.toLowerCase();
        } else if (body.product_name) {
            // Se for um produto avulso, pega o nome do produto
            nomeDoPlano = body.product_name.toLowerCase();
        }

        // Define o plano baseado na palavra-chave encontrada no nome
        if (nomeDoPlano.includes('pro')) {
            planoComprado = 'pro';
        } else if (nomeDoPlano.includes('premium')) {
            planoComprado = 'premium';
        }

        // Chama o banco de dados (Supabase) para atualizar o usuário
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/atualizar_plano_por_email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
            },
            body: JSON.stringify({
                p_email: emailComprador,
                p_novo_plano: planoComprado
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.log("Erro no Supabase:", err);
            return { statusCode: 500, body: 'Erro ao atualizar banco de dados' };
        }

        return { statusCode: 200, body: `Sucesso! Plano ${planoComprado} ativado para ${emailComprador}` };
        
    } catch (error) {
        console.log("Erro no Webhook:", error);
        return { statusCode: 500, body: 'Erro interno no servidor' };
    }
};