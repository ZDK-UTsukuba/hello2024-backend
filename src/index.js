import { Hono } from 'hono'
const app = new Hono()

//esaからデータを取得する関数
const getEsaContents = async (c) =>{
    const cache = await c.env.KV.get('esa');
    //もしキャッシュがあればそれを返す
    if (cache) {
        console.log("hit!");
        return JSON.parse(cache);
    }

    // esa の API を叩いてデータを取得する、特定のカテゴリに含まれ、WIP でない記事のみを絞り込み
    const endpoint = new URL(c.env.ESA_ENDPOINT);

    // 記事の取得
    const postCategory = c.env.ESA_POST_CATEGORY;
    endpoint.searchParams.set('q', `in:${postCategory} wip:false`);

    const postResponse = await fetch(endpoint.href, {
        headers: {
            Authorization: `Bearer ${c.env.ESA_TOKEN}`,
        },
    });
    const postResult = await postResponse.json();

    // FAQの取得
    const faqFullName = c.env.ESA_FAQ_FULLNAME;
    endpoint.searchParams.set('q', `full_name:${faqFullName} wip:false`);

    const faqResponse = await fetch(endpoint.href, {
        headers: {
            Authorization: `Bearer ${c.env.ESA_TOKEN}`,
        },
    });
    const faqResult = await faqResponse.json();

    const result = {
        posts: postResult,
        faqs: faqResult
    };

    //KVにesaの値を保存する
    await c.env.KV.put('esa', JSON.stringify(result),{
        //このデータは6時間キャッシュする
        expirationTtl: 60 * 60 * 6,
    });

    console.log('hit no cache');
    return result;
}

// 記事の取得
const getPosts = async (c) =>{
    const data = await getEsaContents(c);
    return data.posts;
}

// FAQの取得
const getFAQ = async (c) =>{
    const data = await getEsaContents(c);
    return data.faqs.posts[0];
}

//記事のリストを返すエンドポイント
app.get('/posts',async (c) => {
    const data = await getPosts(c);
    const result =  data.posts.map(({ number, name, created_at, full_name}) => {
        const categories = full_name.split('/').slice(5, -1);
        return {
            number,
            name,
            created_at,
            categories,
        };
    });

    return c.json(result);
});

//記事の詳細を返すエンドポイント
app.get('/posts/:number', async(c) =>{
    const number = parseInt(c.req.param('number'));
    const data = await getPosts(c);
    const post = data.posts.find((post) => post.number === number);
    if (!post) {
        return c.text('Not found', 404);
    }

    const categories = post.full_name.split('/').slice(5, -1);
    return c.json({
        number: post.number,
        name: post.name,
        created_at: post.created_at,
        categories,
        body: post.body_md,
    });
});

//FAQを返すエンドポイント
app.get('/faqs',async (c) => {
    const data = await getFAQ(c);

    if (!data) {
        return c.text('Not found', 404);
    }

    const lines = data.body_md.split("\r\n");
    const qAndAList = [];
    const questionRe = /^##\s(.+)\s*$/;
    let tmpQAndA;

    for(const line of lines){
        const result = questionRe.exec(line);
        if(result !== null){
            if(tmpQAndA !== undefined){
                tmpQAndA.answer = tmpQAndA.answer.trim();
                qAndAList.push(tmpQAndA);
            }
            tmpQAndA = {
                question: result[1],
                answer: ""
            };
        }else if(tmpQAndA !== undefined){
            tmpQAndA.answer = tmpQAndA.answer + line + "\r\n";
        }
    }

    tmpQAndA.answer = tmpQAndA.answer.trim();
    qAndAList.push(tmpQAndA);

    return c.json(qAndAList);
});

export default app;
