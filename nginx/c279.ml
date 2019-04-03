server {

    root /var/www/html;

    server_name c279.ml www.c279.ml;
    
    client_max_body_size 500m;

    location / {
        try_files $uri $uri/ =404;
    }

    location /api/ {
            proxy_pass http://localhost:3000;
    }

    listen [::]:443 ssl ipv6only=on; # managed by Certbot
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/c279.ml/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/c279.ml/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}


server {
    if ($host = www.c279.ml) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    if ($host = c279.ml) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80 default_server;
    listen [::]:80 default_server;

    server_name c279.ml www.c279.ml;
    return 404; # managed by Certbot

}
