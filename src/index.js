import { Hono } from 'hono'
const app = new Hono()

//esaからデータを取得する関数
const getPosts = async (c) =>{

    const cache = await c.env.KV.get('esa');
    //もしキャッシュがあればそれを返す
    if (cache) {
        console.log("hit!")
        return JSON.parse(cache);
    }

    // esa の API を叩いてデータを取得する、特定のカテゴリに含まれ、WIP でない記事のみを絞り込み
    const endpoint = new URL('https://api.esa.io/v1/teams/zdk/posts');
    const category = 'project/2023/新情Web/記事/_production';
    endpoint.searchParams.set('q', `in:${category} wip:false`);

    const response = await fetch(endpoint.href, {
        headers: {
            Authorization: `Bearer ${c.env.ESA_TOKEN}`,
        },
    });
    const result = await response.json();

    //KVにesaの値を保存する
    await c.env.KV.put('esa', JSON.stringify(result),{
        //このデータは6時間キャッシュする
        expirationTtl: 60 * 60 * 6,
    });

    console.log('hit no cache');
    return result;
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
app.get('posts/:number', async(c) =>{
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

export default app;
