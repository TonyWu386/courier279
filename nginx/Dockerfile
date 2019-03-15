FROM nginx:alpine

COPY c279.template /etc/nginx/conf.d/c279.conf

CMD echo start && exec nginx -g 'daemon off;'
