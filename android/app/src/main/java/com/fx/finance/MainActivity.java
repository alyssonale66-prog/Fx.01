package com.fx.finance;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // O bloqueio de print (FLAG_SECURE) agora é opcional e gerenciado via JS pelo usuário.
    }
}
