# PluginPulse → AI Marketing Expert Integration

Connect PluginPulse to AI Marketing Expert so that every new PluginPulse user is automatically added as a subscriber in your email marketing CRM.

---

## Prerequisites

- Both plugins installed on the **same WordPress site**.
- AI Marketing Expert **Email Marketing** module is active.
- At least one **List** created in Email Marketing → Lists.

---

## Step 1 — Generate an API Key

1. Go to **AI Marketing Expert → Settings**.
2. Scroll to the **API & Webhooks** card.
3. Click **Generate API Key**.
4. **Copy the key immediately** — it won't be shown again.

---

## Step 2 — Note the Webhook URL

After generating the key, the **Webhook Endpoint** card appears showing:

```
https://yoursite.com/wp-json/aime/v1/email/webhook/subscribe
```

---

## Step 3 — Add Code in PluginPulse

In your PluginPulse plugin, find the place where a new user/license is created and add:

```php
/**
 * Add new PluginPulse user to AI Marketing Expert as a subscriber.
 *
 * @param string $email       User email.
 * @param string $first_name  User first name (optional).
 * @param string $last_name   User last name (optional).
 * @param string $plugin_name Plugin title — used as tag name (e.g. "Click to Top").
 */
function pp_add_to_aime( string $email, string $first_name = '', string $last_name = '', string $plugin_name = '' ): void {
    // Check if AI Marketing Expert is active.
    if ( ! function_exists( 'aime_rest_namespace' ) ) {
        return;
    }

    $api_key = 'aime_YOUR_API_KEY_HERE'; // Replace with your actual API key.
    $list_id = 1;                         // Replace with your target List ID.

    $body = array(
        'email'      => $email,
        'first_name' => $first_name,
        'last_name'  => $last_name,
        'list_id'    => $list_id,
        'status'     => 'subscribed',
    );

    // Send the plugin name as a tag — AIME will find-or-create the tag automatically.
    if ( ! empty( $plugin_name ) ) {
        $body['tag_names'] = array( $plugin_name );
    }

    wp_remote_post( rest_url( 'aime/v1/email/webhook/subscribe' ), array(
        'headers' => array(
            'Content-Type' => 'application/json',
            'X-API-Key'    => $api_key,
        ),
        'body'    => wp_json_encode( $body ),
        'timeout' => 10,
    ) );
}
```

Then call it when a user registers:

```php
// With plugin name as tag (auto-created in AIME):
pp_add_to_aime( $user_email, $user_first_name, $user_last_name, 'Click to Top' );

// Another plugin:
pp_add_to_aime( $user_email, $user_first_name, $user_last_name, 'Gallery Box' );

// Without tag:
pp_add_to_aime( $user_email, $user_first_name, $user_last_name );
```

---

## Optional Parameters

| Parameter       | Type     | Required | Description                                         |
|-----------------|----------|----------|-----------------------------------------------------|
| `email`         | string   | Yes      | Subscriber email address                            |
| `first_name`    | string   | No       | First name                                          |
| `last_name`     | string   | No       | Last name                                           |
| `list_id`       | integer  | No       | List ID to assign the subscriber to                 |
| `tag_ids`       | int[]    | No       | Array of Tag IDs to assign                          |
| `tag_names`     | string[] | No       | Array of tag titles — auto-found or created by slug |
| `status`        | string   | No       | `subscribed` (default), `pending`                   |
| `custom_fields` | object   | No       | Key-value pairs for custom fields                   |

### Example with tag names and custom fields

```php
wp_remote_post( rest_url( 'aime/v1/email/webhook/subscribe' ), array(
    'headers' => array(
        'Content-Type' => 'application/json',
        'X-API-Key'    => $api_key,
    ),
    'body'    => wp_json_encode( array(
        'email'         => 'user@example.com',
        'first_name'    => 'John',
        'last_name'     => 'Doe',
        'list_id'       => 1,
        'tag_names'     => array( 'Click to Top' ),
        'status'        => 'subscribed',
        'custom_fields' => array(
            'company'      => 'Acme Inc',
            'license_type' => 'pro',
        ),
    ) ),
    'timeout' => 10,
) );
```

---

## Step 4 — Set Up Automation (Optional)

To automatically send a welcome email when a new subscriber is added:

1. Go to **Email Marketing → Automations**.
2. Click **New Automation** (or use the "Welcome Email Series" template).
3. Set trigger to **Contact Created**.
4. Add a **Send Email** action with your welcome email.
5. Set status to **Published**.

Now every PluginPulse user will receive the welcome email automatically.

---

## Rate Limits

- **60 requests per minute** per IP address.
- Duplicate emails are handled gracefully — existing subscribers get their lists/tags updated without creating duplicates.

---

## Troubleshooting

| Issue                        | Solution                                                       |
|------------------------------|----------------------------------------------------------------|
| 401 Invalid API key          | Verify the API key matches. Regenerate if needed.              |
| 429 Too many requests        | You're exceeding 60 requests/minute. Batch your imports.       |
| Subscriber not appearing     | Check that Email Marketing module is active.                   |
| Automation not firing        | Ensure the automation status is **Published**, not Draft.      |
| AIME not installed           | The `function_exists` check silently skips if AIME is missing. |
