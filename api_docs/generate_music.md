> ## Documentation Index
>
> Fetch the complete documentation index at: https://docs.kie.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Generate Music

> Generate music with or without lyrics using AI models.

### Usage Guide

- This endpoint creates music based on your text prompt
- Multiple variations will be generated for each request
- You can control detail level with custom mode and instrumental settings

### Parameter Details

- In Custom Mode (`customMode: true`):
  - If `instrumental: true`: `style` and `title` are required
  - If `instrumental: false`: `style`, `prompt`, and `title` are required
  - Character limits vary by model:
    - **V4**: `prompt` 3000 characters, `style` 200 characters
    - **V4_5 & V4_5PLUS**: `prompt` 5000 characters, `style` 1000 characters
    - **V4_5ALL**: `prompt` 5000 characters, `style` 1000 characters
    - **V5**: `prompt` 5000 characters, `style` 1000 characters
  - `title` length limit: 80 characters (all models)

- In Non-custom Mode (`customMode: false`):
  - Only `prompt` is required regardless of `instrumental` setting
  - `prompt` length limit: 500 characters
  - Other parameters should be left empty

### Developer Notes

- Recommendation for new users: Start with `customMode: false` for simpler usage
- Generated files are retained for 14 days
- Callback process has three stages: `text` (text generation), `first` (first track complete), `complete` (all tracks complete)

### Optional parameters

- `vocalGender` (string): Vocal gender preference. Use `m` for male, `f` for female. Note: This parameter is only effective when `customMode` is `true`. Based on practice, this parameter can only increase the probability but cannot guarantee adherence to male/female voice instructions.
- `styleWeight` (number): Strength of adherence to style. Range 0–1, up to 2 decimals. Example: `0.65`.
- `weirdnessConstraint` (number): Controls creative deviation. Range 0–1, up to 2 decimals. Example: `0.65`.
- `audioWeight` (number): Balance weight for audio features. Range 0–1, up to 2 decimals. Example: `0.65`.
- `personaId` (string): Persona ID to apply to the generated music. Use this to apply a specific persona style to your music generation. Only available when Custom Mode is enabled. To generate a persona ID, visit the [Generate Persona](https://docs.kie.ai/suno-api/generate-persona) endpoint.

## OpenAPI

````yaml suno-api/suno-api.json post /api/v1/generate
openapi: 3.0.0
info:
  title: Suno API
  description: kie.ai Suno API Documentation
  version: 1.0.0
  contact:
    name: Technical Support
    email: support@kie.ai
servers:
  - url: https://api.kie.ai
    description: API Server
security:
  - BearerAuth: []
paths:
  /api/v1/generate:
    post:
      summary: Generate Music
      description: >-
        Generate music with or without lyrics using AI models.


        ### Usage Guide

        - This endpoint creates music based on your text prompt

        - Multiple variations will be generated for each request

        - You can control detail level with custom mode and instrumental
        settings


        ### Parameter Details

        - In Custom Mode (`customMode: true`):
          - If `instrumental: true`: `style` and `title` are required
          - If `instrumental: false`: `style`, `prompt`, and `title` are required
          - Character limits vary by model:
            - **V4**: `prompt`  3000 characters, `style` 200 characters
            - **V4_5 & V4_5PLUS**: `prompt`  5000 characters, `style` 1000 characters
            - **V4_5ALL**: `prompt`  5000 characters, `style` 1000 characters
            - **V5**: `prompt`  5000 characters, `style` 1000 characters
          - `title` length limit: 80 characters (all models)

        - In Non-custom Mode (`customMode: false`):
          - Only `prompt` is required regardless of `instrumental` setting
          - `prompt` length limit: 500 characters
          - Other parameters should be left empty

        ### Developer Notes

        - Recommendation for new users: Start with `customMode: false` for
        simpler usage

        - Generated files are retained for 14 days

        - Callback process has three stages: `text` (text generation), `first`
        (first track complete), `complete` (all tracks complete)
      operationId: generate-music
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - customMode
                - instrumental
                - callBackUrl
                - model
                - prompt
              properties:
                prompt:
                  type: string
                  description: >-
                    A description of the desired audio content.  

                    - In Custom Mode (`customMode: true`): Required if
                    `instrumental` is `false`. The prompt will be strictly used
                    as the lyrics and sung in the generated track. Character
                    limits by model:  
                      - **V4**: Maximum 3000 characters  
                      - **V4_5 & V4_5PLUS**: Maximum 5000 characters  
                      - **V4_5ALL**: Maximum 5000 characters  
                      - **V5**: Maximum 5000 characters  
                      Example: "A calm and relaxing piano track with soft melodies"  
                    - In Non-custom Mode (`customMode: false`): Always required.
                    The prompt serves as the core idea, and lyrics will be
                    automatically generated based on it (not strictly matching
                    the input). Maximum 500 characters.  
                      Example: "A short relaxing piano tune"
                  example: A calm and relaxing piano track with soft melodies
                style:
                  type: string
                  description: >-
                    Music style specification for the generated audio.  

                    - Required in Custom Mode (`customMode: true`). Defines the
                    genre, mood, or artistic direction.  

                    - Character limits by model:  
                      - **V4**: Maximum 200 characters  
                      - **V4_5 & V4_5PLUS**: Maximum 1000 characters  
                      - **V4_5ALL**: Maximum 1000 characters  
                      - **V5**: Maximum 1000 characters  
                    - Common examples: Jazz, Classical, Electronic, Pop, Rock,
                    Hip-hop, etc.
                  example: Classical
                title:
                  type: string
                  description: |-
                    Title for the generated music track.  
                    - Required in Custom Mode (`customMode: true`).  
                    - Max length: 80 characters.  
                    - Will be displayed in player interfaces and filenames.
                  example: Peaceful Piano Meditation
                customMode:
                  type: boolean
                  description: >-
                    Determines if advanced parameter customization is enabled.  

                    - If `true`: Allows detailed control with specific
                    requirements for `style` and `title` fields.  

                    - If `false`: Simplified mode where only `prompt` is
                    required and other parameters are ignored.
                  example: true
                instrumental:
                  type: boolean
                  description: >-
                    Determines if the audio should be instrumental (no
                    lyrics).  

                    - In Custom Mode (`customMode: true`):  
                      - If `true`: Only `style` and `title` are required.  
                      - If `false`: `style`, `title`, and `prompt` are required (with prompt used as the exact lyrics).  
                    - In Non-custom Mode (`customMode: false`): No impact on
                    required fields (prompt only).
                  example: true
                model:
                  type: string
                  description: |-
                    The AI model version to use for generation.  
                    - Required for all requests.  
                    - Available options:  
                      - **`V5`**: Superior musical expression, faster generation.  
                      - **`V4_5PLUS`**: V4.5+ delivers richer sound, new ways to create, max 8 min.  
                      - **`V4_5`**: V4.5 enables smarter prompts, faster generations, max 8 min.  
                      - **`V4_5ALL`**: V4.5ALL enables smarter prompts, faster generations, max 8 min.  
                      - **`V4`**: V4 improves vocal quality, max 4 min.
                  enum:
                    - V4
                    - V4_5
                    - V4_5PLUS
                    - V4_5ALL
                    - V5
                  example: V4
                callBackUrl:
                  type: string
                  format: uri
                  description: >-
                    The URL to receive music generation task completion updates.
                    Required for all music generation requests.


                    - System will POST task status and results to this URL when
                    generation completes

                    - Callback process has three stages: `text` (text
                    generation), `first` (first track complete), `complete` (all
                    tracks complete)

                    - Note: Some cases may skip `text` and `first` stages and
                    return `complete` directly

                    - Your callback endpoint should accept POST requests with
                    JSON payload containing task results and audio URLs

                    - For detailed callback format and implementation guide, see
                    [Music Generation
                    Callbacks](https://docs.kie.ai/suno-api/generate-music-callbacks)

                    - Alternatively, use the Get Music Details endpoint to poll
                    task status - To ensure callback security, see [Webhook
                    Verification Guide](/common-api/webhook-verification) for
                    signature verification implementation
                  example: https://api.example.com/callback
                negativeTags:
                  type: string
                  description: >-
                    Music styles or traits to exclude from the generated audio.
                    Optional. Use to avoid specific styles.
                  example: Heavy Metal, Upbeat Drums
                vocalGender:
                  type: string
                  description: >-
                    Vocal gender preference for the singing voice. Optional. Use
                    'm' for male and 'f' for female. Note: This parameter is
                    only effective when customMode is true. Based on practice,
                    this parameter can only increase the probability but cannot
                    guarantee adherence to male/female voice instructions.
                  enum:
                    - m
                    - f
                  example: m
                styleWeight:
                  type: number
                  description: >-
                    Strength of adherence to the specified style. Optional.
                    Range 0–1, up to 2 decimal places.
                  minimum: 0
                  maximum: 1
                  multipleOf: 0.01
                  example: 0.65
                weirdnessConstraint:
                  type: number
                  description: >-
                    Controls experimental/creative deviation. Optional. Range
                    0–1, up to 2 decimal places.
                  minimum: 0
                  maximum: 1
                  multipleOf: 0.01
                  example: 0.65
                audioWeight:
                  type: number
                  description: >-
                    Balance weight for audio features vs. other factors.
                    Optional. Range 0–1, up to 2 decimal places.
                  minimum: 0
                  maximum: 1
                  multipleOf: 0.01
                  example: 0.65
                personaId:
                  type: string
                  description: >-
                    Only available when Custom Mode (`customMode: true`) is
                    enabled. Persona ID to apply to the generated music.
                    Optional. Use this to apply a specific persona style to your
                    music generation. 


                    To generate a persona ID, use the [Generate
                    Persona](https://docs.kie.ai/suno-api/generate-persona)
                    endpoint to create a personalized music Persona based on
                    generated music.
                  example: persona_123
                personaModel:
                  type: string
                  description: >-
                    Persona model type to apply when using `personaId`.
                    Optional.  

                    - `style_persona` (default): Applies style-focused persona
                    characteristics.  

                    - `voice_persona`: Applies voice-focused persona
                    characteristics (only available with V5 model).
                  enum:
                    - style_persona
                    - voice_persona
                  default: style_persona
                  example: style_persona
      responses:
        "200":
          description: Request successful
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
                        description: >-
                          Response Status Codes


                          - **200**: Success - Request has been processed
                          successfully  

                          - **401**: Unauthorized - Authentication credentials
                          are missing or invalid  

                          - **402**: Insufficient Credits - Account does not
                          have enough credits to perform the operation  

                          - **404**: Not Found - The requested resource or
                          endpoint does not exist  

                          - **409**: Conflict - WAV record already exists  

                          - **422**: Validation Error - The request parameters
                          failed validation checks  

                          - **429**: Rate Limited - Request limit has been
                          exceeded for this resource  

                          - **451**: Unauthorized - Failed to fetch the image.
                          Kindly verify any access limits set by you or your
                          service provider  

                          - **455**: Service Unavailable - System is currently
                          undergoing maintenance  

                          - **500**: Server Error - An unexpected error occurred
                          while processing the request
                      msg:
                        type: string
                        description: Error message when code != 200
                        example: success
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          taskId:
                            type: string
                            description: >-
                              Task ID for tracking task status. Use this ID with
                              the "Get Music Details" endpoint to query task
                              details and results.
                            example: 5c79****be8e
        "500":
          $ref: "#/components/responses/Error"
      callbacks:
        audioGenerated:
          "{request.body#/callBackUrl}":
            post:
              description: >-
                System will call this callback when audio generation is
                complete.


                ### Callback Example

                ```json

                {
                  "code": 200,
                  "msg": "All generated successfully.",
                  "data": {
                    "callbackType": "complete",
                    "task_id": "2fac****9f72",
                    "data": [
                      {
                        "id": "e231****-****-****-****-****8cadc7dc",
                        "audio_url": "https://example.cn/****.mp3",
                        "stream_audio_url": "https://example.cn/****",
                        "image_url": "https://example.cn/****.jpeg",
                        "prompt": "[Verse] Night city lights shining bright",
                        "model_name": "chirp-v3-5",
                        "title": "Iron Man",
                        "tags": "electrifying, rock",
                        "createTime": "2025-01-01 00:00:00",
                        "duration": 198.44
                      },
                      {
                        "id": "bd15****1873",
                        "audio_url": "https://example.cn/****.mp3",
                        "stream_audio_url": "https://example.cn/****",
                        "image_url": "https://example.cn/****.jpeg",
                        "prompt": "[Verse] Night city lights shining bright",
                        "model_name": "chirp-v3-5",
                        "title": "Iron Man",
                        "tags": "electrifying, rock",
                        "createTime": "2025-01-01 00:00:00",
                        "duration": 228.28
                      }
                    ]
                  }
                }

                ```
              requestBody:
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        code:
                          type: integer
                          description: Status code
                          example: 200
                        msg:
                          type: string
                          description: Response message
                          example: All generated successfully
                        data:
                          type: object
                          properties:
                            callbackType:
                              type: string
                              description: >-
                                Callback type: text (text generation complete),
                                first (first track complete), complete (all
                                tracks complete)
                              enum:
                                - text
                                - first
                                - complete
                            task_id:
                              type: string
                              description: Task ID
                            data:
                              type: array
                              items:
                                type: object
                                properties:
                                  id:
                                    type: string
                                    description: Audio unique identifier (audioId)
                                  audio_url:
                                    type: string
                                    description: Audio file URL
                                  stream_audio_url:
                                    type: string
                                    description: Streaming audio URL
                                  image_url:
                                    type: string
                                    description: Cover image URL
                                  prompt:
                                    type: string
                                    description: Generation prompt/lyrics
                                  model_name:
                                    type: string
                                    description: Model name used
                                  title:
                                    type: string
                                    description: Music title
                                  tags:
                                    type: string
                                    description: Music tags
                                  createTime:
                                    type: string
                                    description: Creation time
                                    format: date-time
                                  duration:
                                    type: number
                                    description: Audio duration (seconds)
              responses:
                "200":
                  description: Callback received successfully
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
                                  - 400
                                  - 408
                                  - 413
                                  - 500
                                  - 501
                                  - 531
                                description: >-
                                  Response status code


                                  - **200**: Success - Request has been
                                  processed successfully

                                  - **400**: Validation Error - Lyrics contained
                                  copyrighted material.

                                  - **408**: Rate Limited - Timeout.

                                  - **413**: Conflict - Uploaded audio matches
                                  existing work of art.

                                  - **500**: Server Error - An unexpected error
                                  occurred while processing the request

                                  - **501**: Audio generation failed.

                                  - **531**: Server Error - Sorry, the
                                  generation failed due to an issue. Your
                                  credits have been refunded. Please try again.
                              msg:
                                type: string
                                description: Error message when code != 200
                                example: success
                      example:
                        code: 200
                        msg: success
components:
  responses:
    Error:
      description: Server Error
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: API Key
      description: >-
        All APIs require authentication via Bearer Token.


        Get API Key:

        1. Visit [API Key Management Page](https://kie.ai/api-key) to get your
        API Key


        Usage:

        Add to request header:

        Authorization: Bearer YOUR_API_KEY


        Note:

        - Keep your API Key secure and do not share it with others

        - If you suspect your API Key has been compromised, reset it immediately
        in the management page
````
