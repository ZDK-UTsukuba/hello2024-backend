# hello2024-backend
新入生情報Web2024バックエンド

## API

### GET `/posts`

記事一覧を返す

example
```json
[
    {
        "number":971,
        "name":"テスト2",
        "created_at":"2024-02-01T22:17:30+09:00",
        "categories":["test"]
    }
]
```

### GET `posts/:number`

記事の内容を返す

example
```json
{
    "number":971,
    "name":"テスト2",
    "created_at":"2024-02-01T22:17:30+09:00",
    "categories":["test"],
    "body":"テストの2番目のページです"
}
```

### GET `/faqs`

FAQを返す

example
```json
[
    {
        "question": "そぽたんってなんですか",
        "answer": "筑波山に住む妖精です。\r\nそぽ～。\r\n\r\n"
    },
    {
        "question": "筑波大学の住所を教えてください",
        "answer": "茨城県つくば市天王台1-1-1です。\r\n\r\n"
    }
]
```
