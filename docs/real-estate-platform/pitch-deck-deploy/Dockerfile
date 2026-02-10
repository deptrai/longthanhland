# Sử dụng Nginx Alpine image (nhẹ nhất)
FROM nginx:alpine

# Copy file HTML vào thư mục Nginx
COPY index.html /usr/share/nginx/html/
COPY bao-gia-nen-tang-web.html /usr/share/nginx/html/

# Expose port 80
EXPOSE 80

# Nginx sẽ tự động chạy khi container start
CMD ["nginx", "-g", "daemon off;"]

