package com.familyhelper.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle

/**
 * LaunchActivity - Entry point for the app
 *
 * This activity checks if MainActivity is already running in the back stack.
 * If so, it brings it to the front. If not, it launches a new MainActivity.
 *
 * This prevents the issue where the browser session is destroyed when the user
 * switches to another app (e.g., to check email for verification code) because
 * MainActivity is using "standard" launch mode instead of "singleTask".
 */
class LaunchActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val application = application as MainApplication

        // Check if MainActivity is already in the back stack
        if (!application.isActivityInBackStack(MainActivity::class.java)) {
            // MainActivity is not running, start it
            val intent = Intent(this, MainActivity::class.java)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(intent)
        } else {
            // MainActivity is already running, bring it to front
            val intent = Intent(this, MainActivity::class.java)
            intent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
            startActivity(intent)
        }

        // Finish this launcher activity
        finish()
    }
}
