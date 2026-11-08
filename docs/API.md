# 温度参考接口

启动 `python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000`。OpenAPI 路径为 `/openapi.json`，Swagger UI 路径为 `/docs`。

| 方法 | 路径 | 请求与结果 |
| --- | --- | --- |
| GET | `/health` | 返回 `{"status":"ok"}` |
| POST | `/simulate` | 接收场景，返回一次多步温度模拟 |
| POST | `/compare` | 接收 `{"scenarios":[...]}`，按输入顺序返回各自结果 |

最小请求示例：

```json
{"size":2,"tiles":["home","road","lot","water"],"base":38,"duration":180,"steps":20,
 "facilities":[{"kind":"tower","cell":2,"built":0,"wind":0}]}
```

- `tiles` 与可选的 `temp` 以行优先展开，长度为 `size × size`。默认温度由基础值与地表偏差决定。
- `time` 为开始时刻，默认 0。一次请求推进 1–360 步，`time + steps` 须在 `duration` 以内。网格边长范围为 1–20。
- `wind` 的 0、1、2、3 对应东、南、西、北。设施在 `built` 时间之后生效，喷雾到期后停止。
- `rain_until` 是降雨最后一秒，含该秒。事件类型为 `surge`、`outage`、`fault`、`shift`、`shower`、`overload`。事件包含 `start`、`end`、`center` 和可选的 `wind`，按开始时刻排序，`end` 不含在影响窗口内。
- 返回 `time`、`wind`、`average`、`peak`、`temp` 和 `average_by_step`。越界、重复占地和参数不合法时返回 422。单批最多 12 个场景。
- 接口计算温度场和风向，预算、事件生成、城市安全和胜负规则由游戏客户端管理。共享案例在 `tests/scenarios.json`。
