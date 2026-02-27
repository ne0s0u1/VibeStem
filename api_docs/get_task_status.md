> ## Documentation Index
>
> Fetch the complete documentation index at: https://docs.kie.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# 获取音乐任务详情

> 获取音乐生成任务的详细信息。

### 使用指南

- 使用此接口检查任务状态并访问生成结果
- 任务详情包括状态、参数和生成的曲目
- 生成的曲目可通过返回的URL访问

### 状态说明

- `PENDING`: 任务等待处理中
- `TEXT_SUCCESS`: 歌词/文本生成成功
- `FIRST_SUCCESS`: 第一个音轨生成完成
- `SUCCESS`: 所有音轨生成成功
- `CREATE_TASK_FAILED`: 创建任务失败
- `GENERATE_AUDIO_FAILED`: 音频生成失败
- `CALLBACK_EXCEPTION`: 回调过程中出错
- `SENSITIVE_WORD_ERROR`: 内容因敏感词被过滤

### 开发者注意事项

- 对于纯音乐曲目（`instrumental=true`），响应中不会包含歌词数据
- 最大查询频率：每个任务每秒最多3次请求
- 响应包括音频文件、图片和流式端点的直接URL

## OpenAPI

```yaml cn/suno-api/suno-api-cn.json get /api/v1/generate/record-info
openapi: 3.0.0
info:
  title: Suno API
  description: kie.ai Suno API 文档
  version: 1.0.0
  contact:
    name: 技术支持
    email: support@kie.ai
servers:
  - url: https://api.kie.ai
    description: API 服务器
security:
  - BearerAuth: []
paths:
  /api/v1/generate/record-info:
    get:
      summary: 获取音乐任务详情
      description: |-
        获取音乐生成任务的详细信息。

        ### 使用指南
        - 使用此接口检查任务状态并访问生成结果
        - 任务详情包括状态、参数和生成的曲目
        - 生成的曲目可通过返回的URL访问

        ### 状态说明
        - `PENDING`: 任务等待处理中
        - `TEXT_SUCCESS`: 歌词/文本生成成功
        - `FIRST_SUCCESS`: 第一个音轨生成完成
        - `SUCCESS`: 所有音轨生成成功
        - `CREATE_TASK_FAILED`: 创建任务失败
        - `GENERATE_AUDIO_FAILED`: 音频生成失败
        - `CALLBACK_EXCEPTION`: 回调过程中出错
        - `SENSITIVE_WORD_ERROR`: 内容因敏感词被过滤

        ### 开发者注意事项
        - 对于纯音乐曲目（`instrumental=true`），响应中不会包含歌词数据
        - 最大查询频率：每个任务每秒最多3次请求
        - 响应包括音频文件、图片和流式端点的直接URL
      operationId: get-music-details
      parameters:
        - in: query
          name: taskId
          description: 要获取的音乐生成任务的唯一标识符。可以是"生成音乐"任务或"延长音乐"任务返回的taskId。
          required: true
          example: 5c79****be8e
          schema:
            type: string
      responses:
        "200":
          description: 请求成功
          content:
            application/json:
              schema:
                allOf:
                  - type: object
                    properties:
                      code:
                        type: integer
                        enum:
                          - 200
                          - 401
                          - 402
                          - 404
                          - 409
                          - 422
                          - 429
                          - 451
                          - 455
                          - 500
                        description: |-
                          响应状态码

                          - **200**: 成功 - 请求已成功处理
                          - **401**: 未授权 - 身份验证凭据缺失或无效
                          - **402**: 积分不足 - 账户没有足够的积分执行此操作
                          - **404**: 未找到 - 请求的资源或端点不存在
                          - **409**: 冲突 - WAV记录已存在
                          - **422**: 验证错误 - 请求参数未通过验证检查
                          - **429**: 超出限制 - 已超过对此资源的请求限制
                          - **451**: 未授权 - 获取图像失败。请验证您或您的服务提供商设置的任何访问限制。
                          - **455**: 服务不可用 - 系统当前正在进行维护
                          - **500**: 服务器错误 - 处理请求时发生意外错误
                      msg:
                        type: string
                        description: 当 code != 200 时的错误信息
                        example: success
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          taskId:
                            type: string
                            description: 任务ID，用于追踪任务状态。可使用此ID通过 "获取音乐详情" 接口查询任务详情和结果。
                            example: 5c79****be8e
                          parentMusicId:
                            type: string
                            description: 父音乐ID（仅扩展音乐时有值）
                          param:
                            type: string
                            description: 生成任务的参数信息
                          response:
                            type: object
                            properties:
                              taskId:
                                type: string
                                description: 任务ID
                              sunoData:
                                type: array
                                items:
                                  type: object
                                  properties:
                                    id:
                                      type: string
                                      description: 音频唯一标识 (audioId)
                                    audioUrl:
                                      type: string
                                      description: 音频文件URL
                                    streamAudioUrl:
                                      type: string
                                      description: 流式音频URL
                                    imageUrl:
                                      type: string
                                      description: 封面图片URL
                                    prompt:
                                      type: string
                                      description: 生成提示词/歌词
                                    modelName:
                                      type: string
                                      description: 使用的模型名称
                                    title:
                                      type: string
                                      description: 音乐标题
                                    tags:
                                      type: string
                                      description: 音乐标签
                                    createTime:
                                      type: string
                                      description: 创建时间
                                      format: date-time
                                    duration:
                                      type: number
                                      description: 音频时长（秒）
                          status:
                            type: string
                            description: 任务状态
                            enum:
                              - PENDING
                              - TEXT_SUCCESS
                              - FIRST_SUCCESS
                              - SUCCESS
                              - CREATE_TASK_FAILED
                              - GENERATE_AUDIO_FAILED
                              - CALLBACK_EXCEPTION
                              - SENSITIVE_WORD_ERROR
                          type:
                            type: string
                            enum:
                              - chirp-v3-5
                              - chirp-v4
                            description: 任务类型
                          operationType:
                            type: string
                            enum:
                              - generate
                              - extend
                              - upload_cover
                              - upload_extend
                            description: |-
                              操作类型

                              - `generate`: 生成音乐 - 使用AI模型创建新的音乐作品
                              - `extend`: 延长音乐 - 延长或修改现有的音乐作品
                              - `upload_cover`: 上传并翻唱音乐 - 基于上传的音频文件创建新的音乐作品
                              - `upload_extend`: 上传并扩展音乐 - 基于上传的音频文件延长或修改音乐作品
                          errorCode:
                            type: integer
                            format: int32
                            description: |-
                              错误码

                              - **400**: 验证错误 - 歌词包含受版权保护的内容。
                              - **408**: 超出限制 - 超时。
                              - **413**: 冲突 - 上传的音频与现有艺术作品匹配。
                            enum:
                              - 400
                              - 408
                              - 413
                          errorMessage:
                            type: string
                            description: 错误信息，仅当任务失败时有值
              example:
                code: 200
                msg: success
                data:
                  taskId: 5c79****be8e
                  parentMusicId: ""
                  param: >-
                    {"prompt":"A calm piano
                    track","style":"Classical","title":"Peaceful
                    Piano","customMode":true,"instrumental":true,"model":"V3_5"}
                  response:
                    taskId: 5c79****be8e
                    sunoData:
                      - id: e231****-****-****-****-****8cadc7dc
                        audioUrl: https://example.cn/****.mp3
                        streamAudioUrl: https://example.cn/****
                        imageUrl: https://example.cn/****.jpeg
                        prompt: "[Verse] 夜晚城市 灯火辉煌"
                        modelName: chirp-v3-5
                        title: 钢铁侠
                        tags: electrifying, rock
                        createTime: "2025-01-01 00:00:00"
                        duration: 198.44
                  status: SUCCESS
                  type: GENERATE
                  errorCode: null
                  errorMessage: null
        "500":
          $ref: "#/components/responses/Error"
components:
  responses:
    Error:
      description: 服务器错误
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: API Key
      description: |-
        所有接口都需要通过 Bearer Token 方式进行认证。

        获取 API Key:
        1. 访问 [API Key 管理页面](https://kie.ai/api-key) 获取您的 API Key

        使用方式:
        在请求头中添加：
        Authorization: Bearer YOUR_API_KEY

        注意事项：
        - 请妥善保管您的 API Key，不要泄露给他人
        - 如果怀疑 API Key 泄露，请立即在管理页面重置
```
